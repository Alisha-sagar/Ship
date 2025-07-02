import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface FilterOptions {
  minAge?: number;
  maxAge?: number;
  intent?: string;
  interests?: string[];
  city?: string;
  state?: string;
  surname?: string; // <-- NEW
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedFilters({ onFiltersChange, isOpen, onClose }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const filterOptions = useQuery(api.filtering.getFilterOptions);
  const ageStats = useQuery(api.filtering.getAgeStats);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];

    setSelectedInterests(newInterests);
    handleFilterChange('interests', newInterests);
  };

  const applyFilters = () => {
    onFiltersChange(filters);
    onClose();
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedInterests([]);
    onFiltersChange({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Age Range */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Age Range</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Min Age</label>
                <input
                  type="number"
                  min={ageStats?.minAge || 18}
                  max={ageStats?.maxAge || 65}
                  value={filters.minAge || ''}
                  onChange={(e) => handleFilterChange('minAge', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`${ageStats?.minAge || 18}`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Max Age</label>
                <input
                  type="number"
                  min={ageStats?.minAge || 18}
                  max={ageStats?.maxAge || 65}
                  value={filters.maxAge || ''}
                  onChange={(e) => handleFilterChange('maxAge', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`${ageStats?.maxAge || 65}`}
                />
              </div>
            </div>
          </div>

          {/* Intent */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Looking For</h4>
            <select
              value={filters.intent || ''}
              onChange={(e) => handleFilterChange('intent', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Any</option>
              {filterOptions?.intents.map((intent) => (
                <option key={intent} value={intent}>
                  {intent.charAt(0).toUpperCase() + intent.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Interests */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Interests</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {filterOptions?.interests.slice(0, 20).map((interest) => (
                <label key={interest} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedInterests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    className="mr-2 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Location</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">City</label>
                <input
                  type="text"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any city"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">State</label>
                <input
                  type="text"
                  value={filters.state || ''}
                  onChange={(e) => handleFilterChange('state', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any state"
                />
              </div>
            </div>
          </div>

          {/* Surname */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Surname</h4>
            <input
              type="text"
              value={filters.surname || ""}
              onChange={(e) => handleFilterChange("surname", e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Gupta"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={clearFilters}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={applyFilters}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
