# Sistema Híbrido de Plantillas WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a hybrid WhatsApp template system that combines hardcoded system templates with user-editable database templates, including a smart variable parser.

**Architecture:** A centralized service handles variable substitution (name, gender-based greeting, time-of-day greeting). A custom hook merges system templates with those fetched from Supabase. Existing UI components are refactored to consume this unified system.

**Tech Stack:** React, TypeScript, Supabase (PostgreSQL), Lucide React.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260511_create_whatsapp_templates.sql`

- [ ] **Step 1: Create the migration file**

```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('system', 'marketing')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policy for all authenticated users to read templates
CREATE POLICY "Allow authenticated read access" ON whatsapp_templates
  FOR SELECT TO authenticated USING (true);

-- Policy for authenticated users to manage templates
CREATE POLICY "Allow authenticated management" ON whatsapp_templates
  FOR ALL TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_templates;
```

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/20260511_create_whatsapp_templates.sql
git commit -m "db: add whatsapp_templates table"
```

---

### Task 2: Centralized WhatsApp Service

**Files:**
- Create: `src/services/whatsappService.ts`

- [ ] **Step 1: Create the service with variable parser**

```typescript
export interface WhatsAppTemplate {
  id?: string;
  name: string;
  body: string;
  category: 'system' | 'marketing';
}

export const detectGender = (name: string): 'interesado' | 'interesada' => {
  if (!name) return 'interesado';
  const firstName = name.split(' ')[0].toLowerCase().trim();
  const femaleExceptions = ['pilar', 'carmen', 'isabel', 'mar', 'belen', 'belén', 'raquel', 'ines', 'inés', 'beatriz', 'consuelo', 'lourdes', 'mercedes', 'dolores', 'concepcion', 'concepción', 'asuncion', 'asunción', 'rosario', 'virtudes', 'amparo', 'remedios'];
  const maleExceptions = ['borja', 'luca', 'bautista'];
  if (femaleExceptions.includes(firstName)) return 'interesada';
  if (maleExceptions.includes(firstName)) return 'interesado';
  if (firstName.endsWith('a')) return 'interesada';
  return 'interesado';
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Buenos días';
  if (hour >= 14 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export const parseTemplate = (body: string, lead: { name: string }, metadata?: { property?: string }) => {
  const firstName = lead.name.split(' ')[0];
  const greeting = getGreeting();
  const interested = detectGender(lead.name);
  
  return body
    .replace(/{nombre}/g, firstName)
    .replace(/{saludo}/g, greeting)
    .replace(/{interesado}/g, interested)
    .replace(/{propiedad}/g, metadata?.property || 'nuestra promoción');
};

export const getSystemTemplates = (): WhatsAppTemplate[] => [
  {
    name: 'Primer Contacto (Altavik)',
    category: 'system',
    body: '¡{saludo}, {nombre}! Mi nombre es Juan Herrero, de inmobiliaria TERRAVALL. Le escribo porque hemos recibido su solicitud de información sobre la promoción ALTAVIK. ¿Desea concertar una visita?'
  },
  {
    name: 'Confirmación de Visita',
    category: 'system',
    body: 'Hola {nombre}, le confirmo su visita para conocer {propiedad}. Estaremos encantados de atenderle. ¡Un saludo!'
  }
];

export const getWhatsAppUrl = (phone: string, message: string) => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone;
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};
```

- [ ] **Step 2: Commit service**

```bash
git add src/services/whatsappService.ts
git commit -m "feat: add centralized whatsappService"
```

---

### Task 3: WhatsApp Templates Hook

**Files:**
- Create: `src/hooks/useWhatsAppTemplates.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSystemTemplates, type WhatsAppTemplate } from '../services/whatsappService';

export const useWhatsAppTemplates = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const systemTemplates = getSystemTemplates();
      
      const { data, error } = await supabase
        .from('whatsapp_templates' as any)
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setTemplates([...systemTemplates, ...data]);
      } else {
        setTemplates(systemTemplates);
      }
      setLoading(false);
    };

    fetchTemplates();
  }, []);

  return { templates, loading };
};
```

- [ ] **Step 2: Commit hook**

```bash
git add src/hooks/useWhatsAppTemplates.ts
git commit -m "feat: add useWhatsAppTemplates hook"
```

---

### Task 4: Refactor EmailComposerModal (WhatsApp Tab)

**Files:**
- Modify: `src/components/leads/EmailComposerModal.tsx`

- [ ] **Step 1: Integrate hook and templates**

```typescript
// Add imports
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import { parseTemplate, getWhatsAppUrl } from '../../services/whatsappService';

// Inside component:
const { templates: waTemplates, loading: waLoading } = useWhatsAppTemplates();
const [selectedWaTemplate, setSelectedWaTemplate] = useState<string>('');

// Update handleSend for WhatsApp:
// ... (Logic to use parseTemplate and getWhatsAppUrl)
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/leads/EmailComposerModal.tsx
git commit -m "refactor: use smart templates in EmailComposerModal"
```

---

### Task 5: Refactor BulkWhatsAppModal

**Files:**
- Modify: `src/components/leads/BulkWhatsAppModal.tsx`

- [ ] **Step 1: Replace manual message editor with template selector**

```typescript
// Add imports
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import { parseTemplate, getWhatsAppUrl } from '../../services/whatsappService';

// Inside component:
const { templates: waTemplates } = useWhatsAppTemplates();
const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

// Update handleSendToLead to use parser
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/leads/BulkWhatsAppModal.tsx
git commit -m "refactor: use smart templates in BulkWhatsAppModal"
```
