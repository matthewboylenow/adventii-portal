# Branding — Adventii Client Portal

## Overview

This document defines the Adventii Media brand identity as applied to the Client Portal. The design should be professional, clean, and reflect Adventii's core values: straightforward, authentic, and results-driven.

---

## Brand Personality

| Trait | Description | Application |
|-------|-------------|-------------|
| **Straightforward** | Clear, honest communication | No jargon, direct language |
| **Authentic** | Genuine, no gimmicks | Real results focus, transparent processes |
| **Hands-On** | Personal, attentive | Detailed work orders, regular updates |
| **Agile** | Modern, innovative | Clean UI, smooth interactions |
| **Local** | Approachable, down-to-earth | Friendly tone, NJ pride |

---

## Color Palette

### Primary Colors

```css
:root {
  /* Matte Black - Strength, boldness */
  --color-black: #1A1A1A;
  
  /* Pure White - Clarity, simplicity */
  --color-white: #FFFFFF;
}
```

### Accent Color

```css
:root {
  /* Deep Purple - Innovation, creativity */
  --color-purple: #6B46C1;
  --color-purple-light: #805AD5;
  --color-purple-dark: #553C9A;
  --color-purple-50: #FAF5FF;
  --color-purple-100: #F3E8FF;
}
```

### Supporting Grays

```css
:root {
  --gray-50: #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E5E5E5;
  --gray-300: #D4D4D4;
  --gray-400: #A3A3A3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
}
```

### Status Colors

```css
:root {
  /* Success - Green */
  --success-50: #F0FDF4;
  --success-500: #22C55E;
  --success-600: #16A34A;
  --success-700: #15803D;
  
  /* Warning - Amber */
  --warning-50: #FFFBEB;
  --warning-500: #F59E0B;
  --warning-600: #D97706;
  
  /* Error - Red */
  --error-50: #FEF2F2;
  --error-500: #EF4444;
  --error-600: #DC2626;
  
  /* Info - Blue */
  --info-50: #EFF6FF;
  --info-500: #3B82F6;
  --info-600: #2563EB;
}
```

---

## Typography

### Font Families

```css
/* Headings - Audiowide */
@import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

/* Body - Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

### Usage Guidelines

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Logo | Audiowide | Regular | 24px+ |
| Page Title | Audiowide | Regular | 28-32px |
| Section Heading | Inter | Bold (700) | 20-24px |
| Card Title | Inter | Semibold (600) | 16-18px |
| Body Text | Inter | Regular (400) | 14-16px |
| Small Text | Inter | Regular (400) | 12-13px |
| Labels | Inter | Medium (500) | 12-14px |
| Buttons | Inter | Medium (500) | 14-16px |

### Type Scale

```css
/* Tailwind config */
fontSize: {
  'xs': ['12px', { lineHeight: '16px' }],
  'sm': ['14px', { lineHeight: '20px' }],
  'base': ['16px', { lineHeight: '24px' }],
  'lg': ['18px', { lineHeight: '28px' }],
  'xl': ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['30px', { lineHeight: '36px' }],
  '4xl': ['36px', { lineHeight: '40px' }],
}
```

---

## Logo Usage

### Text Logo

```jsx
// Primary logo (dark background)
<span className="font-heading text-2xl text-white tracking-wider">
  ADVENTII
</span>

// Primary logo (light background)
<span className="font-heading text-2xl text-brand-black tracking-wider">
  ADVENTII
</span>

// With tagline
<div>
  <span className="font-heading text-2xl text-brand-purple">ADVENTII</span>
  <span className="text-xs text-gray-500 tracking-wide ml-2">
    MEDIA • REAL SOLUTIONS. REAL RESULTS.
  </span>
</div>
```

### Logo Spacing

- Minimum clear space: Equal to the height of the "A" in ADVENTII
- Minimum size: 100px width
- Always use ALL CAPS for "ADVENTII"

---

## Component Styling

### Buttons

```css
/* Primary Button */
.btn-primary {
  background-color: #6B46C1;
  color: #FFFFFF;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #805AD5;
}

.btn-primary:focus {
  outline: none;
  ring: 2px solid #6B46C1;
  ring-offset: 2px;
}

/* Secondary Button */
.btn-secondary {
  background-color: #F5F5F5;
  color: #1A1A1A;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
}

/* Outline Button */
.btn-outline {
  border: 1px solid #D4D4D4;
  color: #525252;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
}
```

### Cards

```css
/* Default Card */
.card {
  background-color: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Elevated Card */
.card-elevated {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Featured Card (purple accent) */
.card-featured {
  background-color: #FFFFFF;
  border-left: 4px solid #6B46C1;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Form Inputs

```css
/* Text Input */
.input {
  border: 1px solid #D4D4D4;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  border-color: #6B46C1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  outline: none;
}

.input::placeholder {
  color: #A3A3A3;
}

/* Input with error */
.input-error {
  border-color: #EF4444;
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Status Badges

```css
/* Draft */
.badge-draft {
  background-color: #F5F5F5;
  color: #525252;
}

/* Pending */
.badge-pending {
  background-color: #FEF3C7;
  color: #92400E;
}

/* Approved / Success */
.badge-success {
  background-color: #D1FAE5;
  color: #065F46;
}

/* In Progress */
.badge-progress {
  background-color: #F3E8FF;
  color: #6B46C1;
}

/* Error / Past Due */
.badge-error {
  background-color: #FEE2E2;
  color: #991B1B;
}

/* Paid */
.badge-paid {
  background-color: #D1FAE5;
  color: #065F46;
}
```

---

## Layout Guidelines

### Spacing Scale

Use consistent spacing throughout:

```css
/* Tailwind spacing (based on 4px) */
spacing: {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
}
```

### Page Layout

```
┌────────────────────────────────────────────────────────────┐
│ Sidebar (256px)  │  Header (64px height)                  │
│                  ├────────────────────────────────────────┤
│  Logo            │                                        │
│                  │  Main Content                          │
│  Navigation      │  (24px padding)                        │
│                  │                                        │
│                  │                                        │
│                  │                                        │
│  User Info       │                                        │
└──────────────────┴────────────────────────────────────────┘
```

### Content Width

- Max content width: 1200px
- Form max width: 600px
- Table max width: 100% (with horizontal scroll if needed)

---

## Iconography

Use [Lucide Icons](https://lucide.dev) for consistency:

```bash
npm install lucide-react
```

### Common Icons

| Purpose | Icon |
|---------|------|
| Dashboard | `LayoutDashboard` |
| Work Orders | `FileText` |
| Approvals | `CheckSquare` |
| Time Logs | `Clock` |
| Incidents | `AlertTriangle` |
| Invoices | `Receipt` |
| Payments | `CreditCard` |
| Settings | `Settings` |
| Users | `Users` |
| Reports | `BarChart3` |
| Download | `Download` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Add | `Plus` |
| Search | `Search` |
| Filter | `Filter` |
| Close | `X` |
| Menu | `Menu` |
| Check | `Check` |
| Warning | `AlertCircle` |
| Info | `Info` |

### Icon Sizing

| Context | Size |
|---------|------|
| Navigation | 20px |
| Buttons | 16px |
| Inline text | 14px |
| Large feature | 24px |

---

## Animation & Transitions

### Standard Transitions

```css
/* Default transition */
transition: all 0.2s ease;

/* Color transitions */
transition: color 0.2s, background-color 0.2s;

/* Transform transitions */
transition: transform 0.2s ease-out;
```

### Hover States

```css
/* Button hover */
.btn:hover {
  transform: translateY(-1px);
}

/* Card hover */
.card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Link hover */
.link:hover {
  color: #6B46C1;
}
```

### Loading States

```css
/* Skeleton pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: #E5E5E5;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

---

## Responsive Design

### Breakpoints

```css
/* Tailwind breakpoints */
screens: {
  'sm': '640px',   /* Mobile landscape */
  'md': '768px',   /* Tablet */
  'lg': '1024px',  /* Desktop */
  'xl': '1280px',  /* Large desktop */
  '2xl': '1536px', /* Extra large */
}
```

### Mobile Considerations

- Sidebar collapses to hamburger menu on mobile
- Tables become card-based lists on small screens
- Touch targets minimum 44px
- Signature pad optimized for finger/stylus input

---

## Voice & Tone

### Writing Style

| Do | Don't |
|----|-------|
| "Your invoice is ready" | "Invoice #SH-2026-887 has been generated" |
| "Sign to approve" | "Please affix your digital signature" |
| "Something went wrong" | "Error 500: Internal Server Error" |
| "Paid in full" | "Payment status: Complete" |

### Microcopy Examples

**Empty States:**
- "No work orders yet. Create one to get started."
- "No pending approvals. You're all caught up!"

**Success Messages:**
- "Work order saved successfully."
- "Payment received. Thank you!"
- "Signature captured."

**Error Messages:**
- "Couldn't save. Please try again."
- "This field is required."
- "Payment declined. Please try another method."

**Confirmations:**
- "Delete this work order? This can't be undone."
- "Mark as complete? Time logs will be locked."

---

## Accessibility

### Color Contrast

All text meets WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Focus States

All interactive elements have visible focus indicators:

```css
.focus-visible {
  outline: 2px solid #6B46C1;
  outline-offset: 2px;
}
```

### Screen Reader Support

- Use semantic HTML (`<nav>`, `<main>`, `<section>`)
- Include ARIA labels where needed
- Provide alt text for images
- Announce dynamic content changes

---

## Tailwind Configuration Summary

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#1A1A1A',
          white: '#FFFFFF',
          purple: {
            DEFAULT: '#6B46C1',
            light: '#805AD5',
            dark: '#553C9A',
            50: '#FAF5FF',
            100: '#F3E8FF',
          },
        },
      },
      fontFamily: {
        heading: ['Audiowide', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Design Checklist

Before shipping any feature, verify:

- [ ] Uses brand colors correctly
- [ ] Typography follows guidelines
- [ ] Spacing is consistent (multiples of 4px)
- [ ] Interactive elements have hover/focus states
- [ ] Error states are clearly visible
- [ ] Loading states are implemented
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Consistent with existing UI patterns

---

This completes the branding documentation. Use these guidelines to maintain visual consistency throughout the Adventii Client Portal.
