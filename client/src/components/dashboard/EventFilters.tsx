import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Search, Filter, X, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface EventFilter {
  search: string;
  status: 'all' | 'upcoming' | 'past' | 'draft' | 'confirmed' | 'cancelled';
  sport: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  participantRange: {
    min?: number;
    max?: number;
  };
  location: string;
  hasDrivers: boolean | null;
  hasAvailableSeats: boolean | null;
  sortBy: 'date' | 'name' | 'participants' | 'created';
  sortOrder: 'asc' | 'desc';
}

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

interface EventFiltersProps {
  filters: EventFilter;
  onFiltersChange: (filters: EventFilter) => void;
  eventsCount: number;
  filteredCount: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function EventFilters({
  filters,
  onFiltersChange,
  eventsCount,
  filteredCount,
  onExportCSV,
  onExportPDF
}: EventFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Sports prédéfinis (vous pouvez les récupérer depuis une API)
  const sports = [
    'Football', 'Basketball', 'Tennis', 'Running', 'Cycling', 
    'Swimming', 'Volleyball', 'Rugby', 'Handball', 'Badminton'
  ];

  const updateFilter = <K extends keyof EventFilter>(
    key: K,
    value: EventFilter[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const applyTempFilters = () => {
    onFiltersChange(tempFilters);
    setShowAdvanced(false);
  };

  const resetFilters = () => {
    onFiltersChange(defaultFilters);
    setTempFilters(defaultFilters);
  };

  const hasActiveFilters = () => {
    return (
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.sport !== 'all' ||
      filters.location !== '' ||
      filters.dateRange.from ||
      filters.dateRange.to ||
      filters.participantRange.min ||
      filters.participantRange.max ||
      filters.hasDrivers !== null ||
      filters.hasAvailableSeats !== null
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.sport !== 'all') count++;
    if (filters.location) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.participantRange.min || filters.participantRange.max) count++;
    if (filters.hasDrivers !== null) count++;
    if (filters.hasAvailableSeats !== null) count++;
    return count;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Barre de recherche et filtres rapides */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, lieu, sport..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Statut */}
          <Select 
            value={filters.status} 
            onValueChange={(value: any) => updateFilter('status', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les événements</SelectItem>
              <SelectItem value="upcoming">À venir</SelectItem>
              <SelectItem value="past">Passés</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="confirmed">Confirmés</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>

          {/* Sport */}
          <Select 
            value={filters.sport} 
            onValueChange={(value: string) => updateFilter('sport', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sports</SelectItem>
              {sports.map(sport => (
                <SelectItem key={sport} value={sport.toLowerCase()}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tri */}
          <div className="flex gap-2">
            <Select 
              value={filters.sortBy} 
              onValueChange={(value: any) => updateFilter('sortBy', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="participants">Participants</SelectItem>
                <SelectItem value="created">Créé le</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Filtres avancés et actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres avancés
              {getActiveFiltersCount() > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>

            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-4 h-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {filteredCount} / {eventsCount} événements
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onExportCSV}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={onExportPDF}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres avancés */}
        {showAdvanced && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Plage de dates */}
              <div className="space-y-2">
                <Label>Période</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.from ? (
                          format(tempFilters.dateRange.from, "dd/MM/yyyy", { locale: fr })
                        ) : (
                          "Du"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.from}
                        onSelect={(date) => 
                          setTempFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, from: date }
                          }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.to ? (
                          format(tempFilters.dateRange.to, "dd/MM/yyyy", { locale: fr })
                        ) : (
                          "Au"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.to}
                        onSelect={(date) => 
                          setTempFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, to: date }
                          }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Nombre de participants */}
              <div className="space-y-2">
                <Label>Participants</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={tempFilters.participantRange.min || ''}
                    onChange={(e) => 
                      setTempFilters(prev => ({
                        ...prev,
                        participantRange: { 
                          ...prev.participantRange, 
                          min: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={tempFilters.participantRange.max || ''}
                    onChange={(e) => 
                      setTempFilters(prev => ({
                        ...prev,
                        participantRange: { 
                          ...prev.participantRange, 
                          max: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      }))
                    }
                  />
                </div>
              </div>

              {/* Lieu */}
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input
                  placeholder="Lieu de départ ou destination"
                  value={tempFilters.location}
                  onChange={(e) => 
                    setTempFilters(prev => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>

              {/* Options covoiturage */}
              <div className="space-y-2">
                <Label>Covoiturage</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasDrivers"
                      checked={tempFilters.hasDrivers === true}
                      onCheckedChange={(checked) => 
                        setTempFilters(prev => ({
                          ...prev,
                          hasDrivers: checked ? true : null
                        }))
                      }
                    />
                    <Label htmlFor="hasDrivers">Avec conducteurs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasSeats"
                      checked={tempFilters.hasAvailableSeats === true}
                      onCheckedChange={(checked) => 
                        setTempFilters(prev => ({
                          ...prev,
                          hasAvailableSeats: checked ? true : null
                        }))
                      }
                    />
                    <Label htmlFor="hasSeats">Places disponibles</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAdvanced(false)}>
                Annuler
              </Button>
              <Button onClick={applyTempFilters}>
                Appliquer les filtres
              </Button>
            </div>
          </div>
        )}

        {/* Filtres actifs */}
        {hasActiveFilters() && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary">
                Recherche: "{filters.search}"
                <X 
                  className="ml-1 w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('search', '')}
                />
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary">
                Statut: {filters.status}
                <X 
                  className="ml-1 w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('status', 'all')}
                />
              </Badge>
            )}
            {filters.sport !== 'all' && (
              <Badge variant="secondary">
                Sport: {filters.sport}
                <X 
                  className="ml-1 w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('sport', 'all')}
                />
              </Badge>
            )}
            {filters.location && (
              <Badge variant="secondary">
                Lieu: {filters.location}
                <X 
                  className="ml-1 w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('location', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EventFilters;