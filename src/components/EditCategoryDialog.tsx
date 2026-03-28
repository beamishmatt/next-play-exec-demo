import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Category } from '../data/types';
import { toast } from './toast';

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
}

const categories: Category[] = ['Assault', 'Traffic Stop', 'Homicide', 'Theft', 'Shooting', 'Domestic', 'Drug Offense', 'Burglary', 'Police Event', 'Non Event', 'Other'];

export function EditCategoryDialog({ open, onOpenChange, selectedCount }: EditCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCancel = () => {
    setSelectedCategory(null);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (selectedCategory) {
      setIsLoading(true);
      
      // Simulate API call with 800ms delay
      setTimeout(() => {
        console.log('Save category changes:', selectedCategory);
        
        // Show success toast
        toast.success(`Category updated to "${selectedCategory}" for ${selectedCount} evidence ${selectedCount === 1 ? 'item' : 'items'}`, { 
          dismissible: true 
        });
        
        // Reset state and close dialog
        setSelectedCategory(null);
        setIsLoading(false);
        onOpenChange(false);
      }, 800);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Category
          </DialogTitle>
          <DialogDescription>
            Update the category for {selectedCount} selected evidence {selectedCount === 1 ? 'item' : 'items'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative transition-all duration-300 ease-out">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm z-10 rounded-md" />
          )}
          
          <div className="space-y-6 py-4">
            {/* Category selection section */}
            <div className="space-y-3">
              <label htmlFor="category-select">
                Category
              </label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                    style={{ 
                      backgroundColor: 'var(--input-background)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    {selectedCategory || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            value={category}
                            onSelect={() => {
                              setSelectedCategory(category);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCategory === category ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {category}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Dialog actions */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCategory || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}