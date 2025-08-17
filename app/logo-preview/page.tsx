"use client";

import Image from "next/image";

export default function LogoPreview() {
  const concepts = [
    {
      name: "A with Flow",
      description: "Clean 'A' letterform with payment flow arrows",
      file: "/logo-01-a-flow.svg"
    },
    {
      name: "A+P Interlock", 
      description: "Interlocking A and P letters showing connection",
      file: "/logo-02-ap-interlock.svg"
    },
    {
      name: "Split Crossbar",
      description: "Minimalist A with split crossbar (bill splitting metaphor)",
      file: "/logo-03-split-a.svg"
    },
    {
      name: "Stacked Letters",
      description: "Modern stacked A and P with elegant spacing",
      file: "/logo-04-stacked-ap.svg"
    },
    {
      name: "Arrow A",
      description: "A-shaped upward arrow representing growth/movement",
      file: "/logo-05-arrow-a.svg"
    },
    {
      name: "Geometric A",
      description: "Triangular segments forming a modern geometric A",
      file: "/logo-06-geometric-a.svg"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 gradient-text">AnyPay Logo Concepts</h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Exploring visual identity for cross-chain bill splitting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {concepts.map((concept, index) => (
            <div 
              key={index}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold mb-1">{concept.name}</h3>
                <p className="text-[var(--color-text-muted)] text-xs">{concept.description}</p>
              </div>
              
              <div className="bg-white rounded-xl p-4 mb-3 flex items-center justify-center min-h-[80px]">
                <Image src={concept.file} alt={concept.name} width={160} height={80} className="max-w-full h-auto" />
              </div>
              
              <div className="bg-[var(--color-bg-primary)] rounded-xl p-4 flex items-center justify-center min-h-[80px]">
                <Image src={concept.file} alt={`${concept.name} - Dark`} width={160} height={80} className="max-w-full h-auto" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Favicon Preview</h3>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">16x16px</p>
              <Image src="/favicon.svg" alt="Favicon" width={16} height={16} className="mx-auto border border-[var(--color-border)]" />
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">32x32px</p>
              <Image src="/favicon.svg" alt="Favicon" width={32} height={32} className="mx-auto border border-[var(--color-border)]" />
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">48x48px</p>
              <Image src="/favicon.svg" alt="Favicon" width={48} height={48} className="mx-auto border border-[var(--color-border)]" />
            </div>
          </div>
        </div>

        <div className="mt-12 bg-[var(--color-bg-secondary)] rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6">Clean Letter-Based Concepts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-[var(--color-primary)] mb-3">Typography Focus</h4>
              <ul className="text-[var(--color-text-secondary)] space-y-2 text-sm">
                <li>• <strong>Letter A:</strong> Primary brand initial as central element</li>
                <li>• <strong>Split Metaphor:</strong> Crossbar represents bill splitting</li>
                <li>• <strong>Flow Arrows:</strong> Payment direction and movement</li>
                <li>• <strong>Geometric Forms:</strong> Modern, scalable shapes</li>
                <li>• <strong>Minimal Palette:</strong> Your brand cyan + clean whites</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--color-primary)] mb-3">Design Principles</h4>
              <ul className="text-[var(--color-text-secondary)] space-y-2 text-sm">
                <li>• <strong>Clarity:</strong> Instantly readable at any size</li>
                <li>• <strong>Connection:</strong> Letters interlock/flow together</li>
                <li>• <strong>Sophistication:</strong> Professional, tech-forward feel</li>
                <li>• <strong>Versatility:</strong> Works on light and dark backgrounds</li>
                <li>• <strong>Brand Consistency:</strong> Matches your site&apos;s aesthetic</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)] text-sm text-center">
              <strong>Recommended:</strong> &quot;Split Crossbar&quot; or &quot;A with Flow&quot; for the perfect balance of meaning and minimalism
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
