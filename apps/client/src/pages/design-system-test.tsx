import { useState } from 'react';
import { 
  Button, 
  Badge, 
  IconButton, 
  Checkbox, 
  Card, 
  SectionHeader, 
  ListRow, 
  SettingsRow, 
  InlineAlert,
  ConfirmModal
} from '../components/common';
import { Bell, Gear, Trash, Check } from '@phosphor-icons/react';

export default function DesignSystemTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <div className="min-h-screen bg-bg-main text-text-main p-8 space-y-12">
      <SectionHeader 
        title="Design System Verification" 
        description="Testing Atoms and Molecules"
        action={<Button variant="brand">Header Action</Button>}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-2">Atoms: Button</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="brand">Brand</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="glow" size="lg">Glow (Home)</Button>
          <Button variant="brand" disabled>Disabled</Button>
          <Button variant="brand" size="sm">Small</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-2">Atoms: Badge</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="brand">Brand (Reserved)</Badge>
          <Badge variant="success">Success (Confirmed)</Badge>
          <Badge variant="warn">Warn (Waiting)</Badge>
          <Badge variant="danger">Danger (Cancelled)</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-2">Atoms: IconButton</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <IconButton variant="ghost"><Gear weight="fill" /></IconButton>
          <IconButton variant="outline"><Bell weight="bold" /></IconButton>
          <IconButton variant="filled" size="lg"><Trash weight="fill" /></IconButton>
        </div>
      </section>

       <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-2">Atoms: Checkbox</h2>
        <div className="flex flex-col gap-2">
          <Checkbox label="Unchecked" />
          <Checkbox label="Checked" checked readOnly />
          <Checkbox label="Interactive" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <Checkbox label="Disabled" disabled />
          <Checkbox label="Disabled Checked" disabled checked />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold border-b border-border pb-2">Molecules: Card & Rows</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6" hoverable>
            <h3 className="font-bold mb-2">Hoverable Card</h3>
            <p className="text-text-sub">This card has hover effects.</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-bold mb-2">Static Card</h3>
            <p className="text-text-sub">This card is static.</p>
          </Card>
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <ListRow 
            left={<div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red"><Bell /></div>}
            center={
              <div>
                <h4 className="font-bold">List Row Title</h4>
                <p className="text-sm text-text-sub">Description text goes here</p>
              </div>
            }
            right={<Button variant="outline" size="sm">Action</Button>}
            onClick={() => alert('Row clicked')}
          />
          <ListRow 
             left={<div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-text-sub"><Check /></div>}
             center={<h4 className="font-bold">Simple Row</h4>}
          />
        </div>

        <div className="space-y-2">
           <SettingsRow 
            label="Team Name" 
            description="Display name of your team. visible to everyone."
          >
            <Button variant="outline" size="sm">Change</Button>
          </SettingsRow>
          <SettingsRow 
            label="Danger Zone" 
            description="Irreversible actions."
          >
             <Button variant="danger" size="sm" onClick={() => setIsModalOpen(true)}>Delete Team</Button>
          </SettingsRow>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-2">Molecules: InlineAlert</h2>
        <InlineAlert variant="info" title="Information">System will be under maintenance.</InlineAlert>
        <InlineAlert variant="success" title="Success">Reservation confirmed successfully.</InlineAlert>
        <InlineAlert variant="warn">Warning: You have reached the weekly reservation limit.</InlineAlert>
        <InlineAlert variant="error">Error: Unable to connect to server.</InlineAlert>
      </section>

      <ConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => { alert('Confirmed'); setIsModalOpen(false); }}
        title="Delete Team"
        description="Are you sure you want to delete this team? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}
