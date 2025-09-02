import { useState, useMemo } from 'react';
import { Event, EventParticipant } from '@shared/schema';
import type { EventFilter } from '@/components/dashboard/EventFilters';

const defaultFilters: EventFilter = {
  search: '',
  status: 'all',
  sport: 'all',
  dateRange: {},
  participantRange: {},
  location: '',
  hasDrivers: null,
  hasAvailableSeats: null,
  sortBy: 'date',
  sortOrder: 'desc'
};

interface UseEventFiltersProps {
  events: Event[];
  participantsData: Record<string, EventParticipant[]>;
}

export function useEventFilters({ events, participantsData }: UseEventFiltersProps) {
  const [filters, setFilters] = useState<EventFilter>(defaultFilters);

  const filteredAndSortedEvents = useMemo(() => {
    let result = events.filter((event) => {
      // Recherche par nom, lieu, sport, description
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          event.name,
          event.sport,
          event.meetingPoint,
          event.destination,
          event.description || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Filtre par statut
      if (filters.status !== 'all') {
        const eventDate = new Date(event.date);
        const now = new Date();
        
        switch (filters.status) {
          case 'upcoming':
            if (eventDate <= now) return false;
            break;
          case 'past':
            if (eventDate > now) return false;
            break;
          case 'draft':
          case 'confirmed':
          case 'cancelled':
            if (event.status !== filters.status) return false;
            break;
        }
      }

      // Filtre par sport
      if (filters.sport !== 'all') {
        if (event.sport.toLowerCase() !== filters.sport.toLowerCase()) {
          return false;
        }
      }

      // Filtre par plage de dates
      if (filters.dateRange.from || filters.dateRange.to) {
        const eventDate = new Date(event.date);
        
        if (filters.dateRange.from && eventDate < filters.dateRange.from) {
          return false;
        }
        
        if (filters.dateRange.to && eventDate > filters.dateRange.to) {
          return false;
        }
      }

      // Filtre par lieu
      if (filters.location) {
        const locationTerm = filters.location.toLowerCase();
        const locations = [
          event.meetingPoint,
          event.destination
        ].join(' ').toLowerCase();
        
        if (!locations.includes(locationTerm)) {
          return false;
        }
      }

      // Filtres basés sur les participants
      const participants = participantsData[event.id] || [];
      
      // Filtre par nombre de participants
      if (filters.participantRange.min !== undefined && participants.length < filters.participantRange.min) {
        return false;
      }
      
      if (filters.participantRange.max !== undefined && participants.length > filters.participantRange.max) {
        return false;
      }

      // Filtre par présence de conducteurs
      if (filters.hasDrivers === true) {
        const hasDrivers = participants.some(p => p.role === 'driver');
        if (!hasDrivers) return false;
      }

      // Filtre par places disponibles
      if (filters.hasAvailableSeats === true) {
        const drivers = participants.filter(p => p.role === 'driver');
        const passengers = participants.filter(p => p.role === 'passenger');
        const totalSeats = drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);
        const availableSeats = totalSeats - passengers.length;
        
        if (availableSeats <= 0) return false;
      }

      return true;
    });

    // Tri des résultats
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'participants':
          const aParticipants = participantsData[a.id]?.length || 0;
          const bParticipants = participantsData[b.id]?.length || 0;
          comparison = aParticipants - bParticipants;
          break;
        case 'created':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [events, participantsData, filters]);

  // Statistiques pour les filtres
  const stats = useMemo(() => {
    const now = new Date();
    
    return {
      total: events.length,
      filtered: filteredAndSortedEvents.length,
      upcoming: events.filter(e => new Date(e.date) > now).length,
      past: events.filter(e => new Date(e.date) <= now).length,
      confirmed: events.filter(e => e.status === 'confirmed').length,
      draft: events.filter(e => e.status === 'draft').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      withParticipants: events.filter(e => (participantsData[e.id]?.length || 0) > 0).length,
      withDrivers: events.filter(e => 
        (participantsData[e.id] || []).some(p => p.role === 'driver')
      ).length
    };
  }, [events, participantsData, filteredAndSortedEvents]);

  // Sports uniques pour le filtre
  const availableSports = useMemo(() => {
    const sportsSet = new Set(events.map(e => e.sport.toLowerCase()));
    return Array.from(sportsSet).sort();
  }, [events]);

  return {
    filters,
    setFilters,
    filteredEvents: filteredAndSortedEvents,
    stats,
    availableSports,
    resetFilters: () => setFilters(defaultFilters)
  };
}

export default useEventFilters;