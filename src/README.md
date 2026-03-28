# Axon Evidence template

A comprehensive web application that can be used as a starter for your projects.

## 🚀 Quick Start

### For Designers & Product Managers

1. **View the Application**: The app runs in your browser and provides a complete evidence management experience
2. **Test Different Views**: Switch between Evidence, Cases, Community, Devices, and Analytics pages
3. **Explore Responsive Design**: Test on mobile and desktop - the interface adapts automatically
4. **Try Dark/Light Mode**: Use the theme toggle in the utility bar
5. **Interact with Data**: Search, filter, sort, and select items to see all functionality

### Key User Flows to Test

1. **Evidence Management**: Browse evidence → Search/filter → Switch views (table/gallery) → Select items → Use actions
2. **Case Management**: View cases → Open case details → Browse case evidence → Share case → Manage access
3. **Mobile Experience**: Test all flows on mobile devices - notice the adaptive UI and touch-friendly interactions

## 🎨 Design System

### Typography
- **Font Family**: IBM Plex Sans (imported from Google Fonts)
- **Responsive Sizes**: Automatically adjusts for mobile (smaller screens get reduced font sizes)
- **Font Weights**: Regular (400), Medium (500), Semibold (600)

### Color System
- **CSS Variables**: All colors use CSS custom properties for easy theming
- **Light/Dark Mode**: Complete dual-theme support with automatic switching
- **Semantic Colors**: Primary, secondary, accent, success, warning, destructive colors
- **Background Layers**: Base, raised, sunken, and overlay for proper depth

### Spacing & Layout
- **Responsive Grid**: 12-column grid system on desktop, full-width on mobile
- **Consistent Spacing**: Based on CSS variable system
- **Border Radius**: Consistent 4px radius across all components
- **Elevations**: Shadow system for cards, modals, and dropdowns

## 🏗️ Architecture

### Page Structure
```
├── Evidence Page       # Main evidence search and management
├── Cases Page         # Case listing and management
├── Case Detail Page   # Individual case with evidence gallery
├── Community Page     # Team and partner management
├── Devices Page       # Device and source management
└── Analytics Page     # Data insights and reporting
```

### Navigation System
- **Configurable Sidebar**: Easy to customize navigation items
- **Mobile-First**: Collapsible sidebar with overlay on mobile
- **Context-Aware**: Shows/hides based on current page and screen size
- **Utility Bar**: Persistent top bar with title, actions, and theme toggle

### Data Layer
- **TypeScript Interfaces**: Complete type safety for all data structures
- **Mock Data**: Realistic sample data for cases, evidence, and partners
- **Persistence Layer**: LocalStorage-based data persistence for user preferences
- **Search & Filter**: Advanced search capabilities across all data types

## 🔧 Key Components

### Core UI Components
- **ActionBar**: Context-sensitive actions that appear when items are selected
- **SearchBar**: Advanced search with real-time filtering
- **ViewSwitcher**: Toggle between table, gallery, and list views
- **ShareDialog**: Multi-tab sharing interface with user management
- **FilterPanel**: Slide-out filter controls
- **MediaGallery**: Responsive grid for evidence display

### Data Components
- **EvidenceTable**: Sortable, filterable table with selection
- **CasesTable**: Case management with status and collaboration indicators
- **UserAccessList**: User management with avatar system
- **CaseHeader**: Rich case information with sharing indicators

### Mobile-Optimized Components
- **EvidenceList**: Mobile-friendly list view for evidence
- **CaseEvidenceList**: Touch-optimized case evidence browsing
- **Responsive Tables**: Automatic mobile layout switching

## 📱 Mobile Experience

### Responsive Behavior
- **Breakpoint**: 768px (mobile vs desktop)
- **Sidebar**: Overlay mode on mobile, persistent on desktop
- **Tables → Lists**: Automatic view switching for better mobile UX
- **Touch Targets**: All interactive elements sized for touch (44px minimum)
- **Typography**: Smaller font sizes on mobile for better readability

### Mobile-Specific Features
- **Swipe Actions**: Natural mobile interactions
- **Bottom Action Bar**: Persistent actions for selected items
- **Simplified Navigation**: Streamlined mobile navigation patterns

## 🎛️ Customization Guide

### Design System Updates
All design customization happens in `/styles/globals.css`:

```css
/* Update colors */
--primary: rgba(your-color-here);
--accent: rgba(your-accent-color);

/* Update typography */
--text-h1: 36px;  /* Adjust heading sizes */
--font-weight-medium: 500;  /* Adjust weights */

/* Update spacing */
--radius: 8px;  /* Increase border radius */
```

### Navigation Customization
In `/App.tsx`, modify the `navigationItems` array:

```typescript
const navigationItems: NavItem[] = [
  { id: 'evidence', label: 'Evidence', icon: <YourIcon />, path: '/evidence' },
  { id: 'new-section', label: 'New Section', icon: <NewIcon />, path: '/new' },
  // Add, remove, or reorder items
];
```

### Adding New Pages
1. Create page component in `/components/pages/`
2. Add route to `/App.tsx`
3. Add navigation item to `navigationItems`
4. Update page title logic in `getPageTitle()`

## 📂 File Structure Guide

### `/components/`
- **`/pages/`**: Full page components (Evidence, Cases, etc.)
- **`/ui/`**: Reusable UI components (buttons, inputs, etc.)
- **Core Components**: Business logic components (SearchBar, ActionBar, etc.)

### `/data/`
- **`types.ts`**: TypeScript interfaces for all data structures
- **`mock*.ts`**: Sample data files
- **`persistenceLayer.ts`**: LocalStorage data management
- **`searchHelpers.ts`**: Search and filter utilities

### `/styles/`
- **`globals.css`**: Complete design system and CSS variables

## 🔄 Development Workflow

### For Designers
1. **Design System Changes**: Edit `/styles/globals.css` CSS variables
2. **Component Styling**: Use existing CSS variables in component styles
3. **New Components**: Follow existing patterns and variable usage
4. **Testing**: Check both light/dark modes and mobile/desktop

### For Product Managers
1. **Feature Planning**: Review existing components and data structures
2. **User Flow Testing**: Use the application to understand current capabilities
3. **Requirements**: Reference TypeScript interfaces for data requirements
4. **Prioritization**: Understand component relationships for impact assessment

## 🚦 Feature Status

### ✅ Complete Features
- Evidence search, filtering, and view switching
- Case management with collaboration features
- User sharing and access control
- Mobile-responsive design
- Light/dark theme switching
- Data persistence
- Advanced search capabilities

### 🔄 In Progress
- Analytics dashboard (placeholder ready)
- Community features (structure ready)
- Device management (placeholder ready)

### 📋 Ready for Extension
- Evidence detail views
- Case workflow management
- Notification system
- Advanced reporting
- Integration APIs

## 💡 Tips for Success

### For Designers
- **Use CSS Variables**: Always use the design system variables instead of hardcoded values
- **Test Responsively**: Check all changes on mobile and desktop
- **Follow Patterns**: Study existing components before creating new ones
- **Accessibility**: All components follow accessibility best practices

### For Product Managers
- **Data-Driven**: All features are built around real data structures
- **User-Centered**: Interface adapts to user context and device capabilities
- **Scalable**: Architecture supports adding new features without major refactoring
- **Collaborative**: Built-in sharing and collaboration features support team workflows

## 🤝 Contributing to your project

When adding new features or making changes:

1. **Follow the Design System**: Use CSS variables and existing patterns
2. **Maintain Responsiveness**: Test on all screen sizes
3. **TypeScript First**: Define interfaces before implementing features
4. **Component Reuse**: Look for existing components before creating new ones
5. **Accessibility**: Maintain keyboard navigation and screen reader support

## 📞 Add to the template

If you feel like something needs to be added to the template. Follow these steps:

1. **Start a new fresh template**: Begin with a clean instance of the current template
2. **Only make the changes we want to add to the template**: Implement only the specific features or improvements intended for the template - avoid adding project-specific customizations
3. **Review with Kevin Gangi**: Schedule a review session to validate the changes and ensure they align with template standards
4. **Template replacement**: We will remove the existing template and publish the new version once approved

This process ensures template updates are intentional, high-quality, and beneficial for all future projects.