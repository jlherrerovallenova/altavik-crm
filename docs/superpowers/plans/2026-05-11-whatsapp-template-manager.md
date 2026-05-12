# Gestor de Plantillas WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a user-friendly template manager in the Settings page to CRUD WhatsApp templates with live preview.

**Architecture:** A new tab component `WhatsAppTab.tsx` will handle data management. The Settings layout will be updated to include this new section.

**Tech Stack:** React, Lucide Icons, Supabase (JS Client).

---

### Task 1: Update Settings Sidebar and Navigation

**Files:**
- Modify: `src/components/settings/SettingsSidebar.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add "whatsapp" to SettingsTab type and sidebar**

```typescript
// src/components/settings/SettingsSidebar.tsx
// Update type if defined locally or import it
export type SettingsTab = 'profile' | 'integrations' | 'documents' | 'inventory' | 'clients' | 'whatsapp';

// Add to menu items:
{ id: 'whatsapp', label: 'Plantillas WhatsApp', icon: MessageCircle },
```

- [ ] **Step 2: Update Settings.tsx to render the new tab**

```typescript
// src/pages/Settings.tsx
// Import WhatsAppTab (to be created)
import { WhatsAppTab } from '../components/settings/WhatsAppTab';

// Inside renderTabContent switch:
case 'whatsapp': return <WhatsAppTab />;
```

- [ ] **Step 3: Commit navigation changes**

```bash
git add src/components/settings/SettingsSidebar.tsx src/pages/Settings.tsx
git commit -m "refactor: add whatsapp tab navigation in settings"
```

---

### Task 2: Create WhatsApp Template Manager Component

**Files:**
- Create: `src/components/settings/WhatsAppTab.tsx`

- [ ] **Step 1: Implement basic structure and data fetching**

```typescript
// src/components/settings/WhatsAppTab.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, MessageCircle, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseTemplate } from '../../services/whatsappService';

export const WhatsAppTab: React.FC = () => {
  // States: templates, selectedTemplate, editingTemplate, loading, saving
  // Fetch logic
  // Render list and editor
};
```

- [ ] **Step 2: Add Visual Editor and Live Preview**

```typescript
// Inside WhatsAppTab render:
// Left pane: Template List
// Right pane: Editor Form (Name, Category, Body, Active)
// Bottom of editor: Live Preview box using parseTemplate(body, { name: 'Cliente Ejemplo' })
```

- [ ] **Step 3: Add CRUD logic (Save/Delete)**

```typescript
// handleSave: supabase.from('whatsapp_templates').upsert()
// handleDelete: supabase.from('whatsapp_templates').delete() (block if category === 'system')
```

- [ ] **Step 4: Commit component**

```bash
git add src/components/settings/WhatsAppTab.tsx
git commit -m "feat: add WhatsAppTab component for template management"
```

---

### Task 3: Visual Polish and Verification

**Files:**
- Modify: `src/components/settings/WhatsAppTab.tsx`

- [ ] **Step 1: Apply glassmorphism and emerald theme**

```typescript
// Ensure consistent styling with Altavik-600 and emerald accents for WhatsApp.
```

- [ ] **Step 2: Verify functionality**
- Check that new templates appear in `EmailComposerModal` and `BulkWhatsAppModal`.
- Verify that variable parsing works in the live preview.

- [ ] **Step 3: Commit final polish**

```bash
git add src/components/settings/WhatsAppTab.tsx
git commit -m "style: polish WhatsAppTab UI"
```
