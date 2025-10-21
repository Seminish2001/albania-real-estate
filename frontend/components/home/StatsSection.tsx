import type { LucideIcon } from 'lucide-react';
import { Building2, Users, ShieldCheck, TrendingUp } from 'lucide-react';

interface StatItem {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
}

const stats: StatItem[] = [
  {
    icon: Building2,
    value: '5,000+',
    label: 'Verified Listings',
    description: 'Curated properties vetted by our quality assurance team.',
  },
  {
    icon: Users,
    value: '12,000+',
    label: 'Active Buyers',
    description: 'Engaged community searching for their next property.',
  },
  {
    icon: ShieldCheck,
    value: '98%',
    label: 'Client Satisfaction',
    description: 'High rating from both property seekers and agents.',
  },
  {
    icon: TrendingUp,
    value: '24/7',
    label: 'Support Availability',
    description: 'Dedicated assistance whenever you need it.',
  },
];

export default function StatsSection() {
  return (
    <section className="section-padding py-16 bg-gray-50">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Why Albanians Trust Immo Albania</h2>
          <p className="text-lg text-gray-600 mt-4">
            We combine local expertise with modern technology to deliver a premium property search experience.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-primary-600 uppercase tracking-wide mt-1">{stat.label}</div>
              <p className="text-sm text-gray-600 mt-3">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
