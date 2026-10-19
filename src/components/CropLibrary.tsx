import { useState, useMemo } from 'react';
import { Search, Sprout, ChevronRight, Droplets, Calendar, Sparkles, Filter } from 'lucide-react';
import { CROPS_CATALOG, CROP_CATEGORIES, type CropProfile } from '../data/cropsData';

interface CropLibraryProps {
  onSelectCropForDetail: (cropId: string) => void;
  onSelectCropForAnalysis: (cropId: string) => void;
}

export default function CropLibrary({
  onSelectCropForDetail,
  onSelectCropForAnalysis
}: CropLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCrops = useMemo(() => {
    return CROPS_CATALOG.filter(c => {
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.localName.toLowerCase().includes(q) ||
        c.scientificName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="crop-library-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AGRICULTURAL KNOWLEDGE BASE</p>
          <h1>Crop Profiles & Agronomic Catalog</h1>
          <p className="subheading">
            Comprehensive library of {CROPS_CATALOG.length} Maharashtra and Indian crops with phenological growth stages, optimal moisture/pH/NPK envelopes, and disease prevention schedules.
          </p>
        </div>
      </div>

      {/* Toolbar: Category Filters & Search */}
      <div className="crop-catalog-toolbar">
        <div className="catalog-categories-bar">
          <button
            className={`catalog-cat-btn ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All Crops ({CROPS_CATALOG.length})
          </button>
          {CROP_CATEGORIES.map(cat => {
            const count = CROPS_CATALOG.filter(c => c.category === cat).length;
            return (
              <button
                key={cat}
                className={`catalog-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="catalog-search-wrap">
          <Search size={16}/>
          <input
            type="text"
            placeholder="Search crops by English, Marathi (उदा. कापूस, कांदा, ऊस) or botanical name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="catalog-status-bar">
        <span>Showing <strong>{filteredCrops.length}</strong> crop profiles</span>
        {selectedCategory !== 'All' && <span className="active-filter-tag">Category: {selectedCategory}</span>}
      </div>

      {/* Crops Cards Grid */}
      <div className="crops-catalog-grid">
        {filteredCrops.map(crop => (
          <article key={crop.id} className="crop-catalog-card">
            <div className="crop-card-top-banner">
              <span className="crop-emoji-display">{crop.emoji}</span>
              <span className="crop-season-tag">{crop.season}</span>
            </div>

            <div className="crop-card-main">
              <div className="crop-title-group">
                <h3>{crop.name}</h3>
                <span className="crop-local-name">{crop.localName}</span>
                <span className="crop-scientific-name">{crop.scientificName}</span>
              </div>

              <div className="crop-category-badge-chip">
                {crop.category}
              </div>

              <div className="crop-key-stats">
                <div>
                  <small>DURATION</small>
                  <strong><Calendar size={13}/> {crop.durationDays} days</strong>
                </div>
                <div>
                  <small>WATER REQ.</small>
                  <strong><Droplets size={13}/> {crop.waterRequirementMm} mm</strong>
                </div>
                <div>
                  <small>STAGES</small>
                  <strong><Sprout size={13}/> {crop.growthStages.length} stages</strong>
                </div>
              </div>

              <div className="crop-envelope-summary">
                <div className="envelope-row">
                  <span>Soil Moisture:</span>
                  <strong>{crop.optimalRanges.moistureMin}% - {crop.optimalRanges.moistureMax}%</strong>
                </div>
                <div className="envelope-row">
                  <span>Soil pH:</span>
                  <strong>{crop.optimalRanges.phMin} - {crop.optimalRanges.phMax}</strong>
                </div>
                <div className="envelope-row">
                  <span>Target NPK:</span>
                  <strong>{crop.optimalRanges.nitrogenKgHa.target} : {crop.optimalRanges.phosphorusKgHa.target} : {crop.optimalRanges.potassiumKgHa.target}</strong>
                </div>
              </div>

              <div className="crop-card-bottom-actions">
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => onSelectCropForDetail(crop.id)}
                >
                  View Details <ChevronRight size={14}/>
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onSelectCropForAnalysis(crop.id)}
                >
                  <Sparkles size={13}/> Analyze
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
