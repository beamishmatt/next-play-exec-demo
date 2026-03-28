import React from 'react';
import { Pill } from '../ui/pill';
import { Star, Heart, Tag, Filter, Check, Calendar, User, MapPin } from 'lucide-react';

export function PillsPage() {
  const [selectedPills, setSelectedPills] = React.useState<string[]>(['video', 'favorite']);
  const [dismissiblePills, setDismissiblePills] = React.useState<string[]>(['tag1', 'tag2', 'tag3', 'tag4']);

  const togglePill = (id: string) => {
    setSelectedPills(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const dismissPill = (id: string) => {
    setDismissiblePills(prev => prev.filter(p => p !== id));
  };

  const resetDismissible = () => {
    setDismissiblePills(['tag1', 'tag2', 'tag3', 'tag4']);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="mb-2">Pill Components</h1>
        <p style={{ color: 'var(--text-weak)' }}>Interactive pill components with three variants: default, selected, and dismissible.</p>
      </div>

      {/* Default Pills */}
      <section className="mb-12">
        <h3 className="mb-4">Default Pills</h3>
        <p className="mb-4" style={{ color: 'var(--text-weak)' }}>
          Non-interactive pills with fill-weak background and text-strong color. Click to interact.
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill variant="default" onClick={() => console.log('clicked')}>
            Default
          </Pill>
          <Pill variant="default" onClick={() => console.log('clicked')}>
            <Tag className="w-3 h-3" />
            With Icon
          </Pill>
          <Pill variant="default" onClick={() => console.log('clicked')}>
            <Filter className="w-3 h-3" />
            Filter Tag
          </Pill>
          <Pill variant="default" onClick={() => console.log('clicked')}>
            <Calendar className="w-3 h-3" />
            Date Filter
          </Pill>
          <Pill variant="default" onClick={() => console.log('clicked')}>
            <User className="w-3 h-3" />
            User Filter
          </Pill>
          <Pill variant="default" onClick={() => console.log('clicked')}>
            <MapPin className="w-3 h-3" />
            Location
          </Pill>
        </div>
      </section>

      {/* Selected Pills */}
      <section className="mb-12">
        <h3 className="mb-4">Selected Pills</h3>
        <p className="mb-4" style={{ color: 'var(--text-weak)' }}>
          Pills with fill-key-strong background and text-inverse-strong color to indicate active state.
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill variant="selected" onClick={() => console.log('clicked')}>
            Selected
          </Pill>
          <Pill variant="selected" onClick={() => console.log('clicked')}>
            <Check className="w-3 h-3" />
            Active
          </Pill>
          <Pill variant="selected" onClick={() => console.log('clicked')}>
            <Star className="w-3 h-3" />
            Starred
          </Pill>
          <Pill variant="selected" onClick={() => console.log('clicked')}>
            <Heart className="w-3 h-3" />
            Favorited
          </Pill>
        </div>
      </section>

      {/* Dismissible Pills */}
      <section className="mb-12">
        <h3 className="mb-4">Dismissible Pills</h3>
        <p className="mb-4" style={{ color: 'var(--text-weak)' }}>
          Pills with an X button that can be dismissed. Click the X to remove them.
        </p>
        <div className="flex flex-wrap gap-2">
          {dismissiblePills.map((id) => (
            <Pill 
              key={id} 
              variant="dismissible" 
              onDismiss={() => dismissPill(id)}
            >
              {id === 'tag1' && <><Tag className="w-3 h-3" />Removable Tag</>}
              {id === 'tag2' && <><Filter className="w-3 h-3" />Applied Filter</>}
              {id === 'tag3' && <><Star className="w-3 h-3" />Temporary Item</>}
              {id === 'tag4' && <>Dismissible</>}
            </Pill>
          ))}
          {dismissiblePills.length === 0 && (
            <p style={{ color: 'var(--text-weak)' }}>All pills dismissed.</p>
          )}
        </div>
        {dismissiblePills.length < 4 && (
          <button 
            className="mt-4 px-4 py-2 rounded border"
            style={{ 
              borderColor: 'var(--border)',
              backgroundColor: 'var(--fill-weak)',
              color: 'var(--text-strong)'
            }}
            onClick={resetDismissible}
          >
            Reset Pills
          </button>
        )}
      </section>

      {/* Interactive Example: File Type Filters */}
      <section className="mb-12">
        <h3 className="mb-4">Interactive Example: Toggleable Filters</h3>
        <p className="mb-4" style={{ color: 'var(--text-weak)' }}>
          Click pills to toggle between default and selected states.
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill 
            variant={selectedPills.includes('video') ? 'selected' : 'default'}
            onClick={() => togglePill('video')}
          >
            {selectedPills.includes('video') ? <Check className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
            Video
          </Pill>
          <Pill 
            variant={selectedPills.includes('audio') ? 'selected' : 'default'}
            onClick={() => togglePill('audio')}
          >
            {selectedPills.includes('audio') ? <Check className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
            Audio
          </Pill>
          <Pill 
            variant={selectedPills.includes('image') ? 'selected' : 'default'}
            onClick={() => togglePill('image')}
          >
            {selectedPills.includes('image') ? <Check className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
            Image
          </Pill>
          <Pill 
            variant={selectedPills.includes('document') ? 'selected' : 'default'}
            onClick={() => togglePill('document')}
          >
            {selectedPills.includes('document') ? <Check className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
            Document
          </Pill>
          <Pill 
            variant={selectedPills.includes('favorite') ? 'selected' : 'default'}
            onClick={() => togglePill('favorite')}
          >
            {selectedPills.includes('favorite') ? <Heart className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
            Favorites
          </Pill>
        </div>
        <p className="mt-4 caption" style={{ color: 'var(--text-weak)' }}>
          Selected: {selectedPills.length > 0 ? selectedPills.join(', ') : 'none'}
        </p>
      </section>

      {/* States Example */}
      <section className="mb-12">
        <h3 className="mb-4">All States</h3>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <p className="caption mb-3" style={{ color: 'var(--text-weak)' }}>Default State</p>
            <Pill variant="default" onClick={() => {}}>
              <Tag className="w-3 h-3" />
              Hover Me
            </Pill>
          </div>
          <div>
            <p className="caption mb-3" style={{ color: 'var(--text-weak)' }}>Selected State</p>
            <Pill variant="selected" onClick={() => {}}>
              <Check className="w-3 h-3" />
              Hover Me
            </Pill>
          </div>
          <div>
            <p className="caption mb-3" style={{ color: 'var(--text-weak)' }}>Dismissible State</p>
            <Pill variant="dismissible" onDismiss={() => alert('Dismissed!')}>
              <Tag className="w-3 h-3" />
              Hover Me
            </Pill>
          </div>
        </div>
      </section>
    </div>
  );
}
