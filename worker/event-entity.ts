import { IndexedEntity, Index } from "./core-utils";
import type { Event, EventParticipant } from "@shared/types";
import type { Env } from "./core-utils";

export class EventEntity extends IndexedEntity<Event> {
  static readonly entityName = "event";
  static readonly indexName = "events";
  static get initialState(): Event {
    return {
      id: "",
      title: "",
      description: "",
      date: "",
      time: "",
      imageUrl: "",
      capacity: null, // unlimited by default
      registeredCount: 0,
      price: 0,
      status: 'active',
      createdAt: 0,
      participants: [],
    };
  }

  /**
   * Override create method to add debugging
   */
  static async create(env: Env, state: Event): Promise<Event> {
    console.log('EventEntity.create called with state ID:', state.id);
    const id = state.id;
    const inst = new this(env, id);
    await inst.save(state);
    console.log('Event saved to Durable Object:', id);

    const idx = new Index<string>(env, this.indexName);
    await idx.add(id);
    console.log('Event ID added to index:', id);

    return state;
  }

  /**
   * Override list method to add debugging
   */
  static async list(env: Env): Promise<{ items: Event[]; next: string | null }> {
    console.log('EventEntity.list called - retrieving from index:', this.indexName);
    const idx = new Index<string>(env, this.indexName);
    const { items: ids, next } = await idx.page();
    console.log('Found IDs in index:', ids);

    const rows = (await Promise.all(ids.map((id) => new this(env, id).getState()))) as Event[];
    console.log('Retrieved', rows.length, 'events from Durable Objects');
    return { items: rows, next };
  }

  /**
   * Register a participant to the event
   */
  async registerParticipant(participantData: Omit<EventParticipant, 'id' | 'registrationDate' | 'status'>): Promise<{ success: boolean; error?: string }> {
    return this.mutate(event => {
      // Check if capacity is limited and if it's reached
      if (event.capacity !== null && event.registeredCount >= event.capacity) {
        throw new Error('Event capacity reached');
      }

      // Check if participant already registered
      const existingParticipant = event.participants.find(p => p.email === participantData.email);
      if (existingParticipant) {
        throw new Error('Email already registered for this event');
      }

      const newParticipant: EventParticipant = {
        ...participantData,
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        registrationDate: Date.now(),
        status: 'registered',
      };

      const updatedParticipants = [newParticipant, ...event.participants];
      
      // Keep only the latest 50 participants to avoid unbounded growth
      if (updatedParticipants.length > 50) {
        updatedParticipants.length = 50;
      }

      return {
        ...event,
        registeredCount: event.registeredCount + 1,
        participants: updatedParticipants,
      };
    }).catch(error => {
      return { success: false, error: error.message };
    });
  }

  /**
   * Update event status
   */
  async updateStatus(status: 'active' | 'inactive' | 'cancelled' | 'completed'): Promise<Event> {
    return this.mutate(event => ({
      ...event,
      status
    }));
  }

  /**
   * Migrate existing events to the database
   * @param events - Array of events to migrate
   */
  static async migrateEvents(env: Env, events: Event[]): Promise<void> {
    for (const event of events) {
      // Check if event already exists
      const entity = new EventEntity(env, event.id);
      const exists = await entity.exists();

      if (!exists) {
        // Create the event if it doesn't exist
        await EventEntity.create(env, event);
        console.log(`Migrated event: ${event.title} (${event.id})`);
      } else {
        console.log(`Event already exists: ${event.title} (${event.id})`);
      }
    }
  }
}