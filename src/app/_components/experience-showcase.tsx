"use client";

import {
  Palmtree,
  Waves,
  Sunset,
  Sailboat,
  UtensilsCrossed,
  TreePine,
  Heart,
  Star,
  Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Experience {
  title: string;
  tagline: string;
  icon: LucideIcon;
  gradient: string;
  iconGradient: string;
  gridClass: string;
  large?: boolean;
}

const experiences: Experience[] = [
  {
    title: "Island Paradise",
    tagline: "Experience tropical living at its finest",
    icon: Palmtree,
    gradient: "from-teal-600/40 via-emerald-700/30 to-teal-900/50",
    iconGradient: "from-teal-400 to-emerald-500",
    gridClass: "sm:col-span-2 md:[grid-column:1/3] md:[grid-row:1/3]",
    large: true,
  },
  {
    title: "Crystal Waters",
    tagline: "Snorkel pristine coral reefs",
    icon: Waves,
    gradient: "from-cyan-600/40 via-blue-700/30 to-cyan-900/50",
    iconGradient: "from-cyan-400 to-blue-500",
    gridClass: "sm:col-span-2 md:[grid-column:3/5] md:[grid-row:1/2]",
  },
  {
    title: "Sunset Lounge",
    tagline: "Golden hour cocktails",
    icon: Sunset,
    gradient: "from-amber-600/40 via-orange-700/30 to-amber-900/50",
    iconGradient: "from-amber-400 to-orange-500",
    gridClass: "md:[grid-column:3/4] md:[grid-row:2/3]",
  },
  {
    title: "Water Sports",
    tagline: "Kayak, paddleboard & more",
    icon: Sailboat,
    gradient: "from-blue-600/40 via-indigo-700/30 to-blue-900/50",
    iconGradient: "from-blue-400 to-indigo-500",
    gridClass: "md:[grid-column:4/5] md:[grid-row:2/3]",
  },
  {
    title: "Fresh Cuisine",
    tagline: "Ocean-to-table dining",
    icon: UtensilsCrossed,
    gradient: "from-emerald-600/40 via-teal-700/30 to-emerald-900/50",
    iconGradient: "from-emerald-400 to-teal-500",
    gridClass: "md:[grid-column:1/2] md:[grid-row:3/5]",
  },
  {
    title: "Eco Adventures",
    tagline: "Nature trails & wildlife",
    icon: TreePine,
    gradient: "from-green-600/40 via-emerald-700/30 to-green-900/50",
    iconGradient: "from-green-400 to-emerald-500",
    gridClass: "md:[grid-column:2/3] md:[grid-row:3/4]",
  },
  {
    title: "Wellness Retreat",
    tagline: "Yoga & spa by the sea",
    icon: Heart,
    gradient: "from-purple-600/40 via-pink-700/30 to-purple-900/50",
    iconGradient: "from-purple-400 to-pink-500",
    gridClass: "md:[grid-column:2/3] md:[grid-row:4/5]",
  },
  {
    title: "Starlit Nights",
    tagline: "Bonfires under the stars",
    icon: Star,
    gradient: "from-indigo-600/40 via-purple-700/30 to-indigo-900/50",
    iconGradient: "from-indigo-400 to-purple-500",
    gridClass: "sm:col-span-2 md:[grid-column:3/5] md:[grid-row:3/5]",
    large: true,
  },
];

function ExperienceCard({
  experience,
  index,
}: {
  experience: Experience;
  index: number;
}) {
  const Icon = experience.icon;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${experience.gradient} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/10 ${experience.gridClass}`}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "backwards",
      }}
    >
      {/* Dot texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Gradient glow in corner */}
      <div
        className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${experience.iconGradient} opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-30`}
      />

      {/* Content */}
      <div
        className={`relative flex h-full flex-col justify-end ${experience.large ? "p-8 md:p-10" : "p-6 md:p-8"}`}
      >
        {/* Photo coming indicator */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/40">
          <Camera className="h-3 w-3" />
          <span>Photo coming</span>
        </div>

        {/* Icon */}
        <div
          className={`mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br ${experience.iconGradient} shadow-lg transition-transform duration-300 group-hover:scale-110 ${experience.large ? "h-16 w-16" : "h-12 w-12"}`}
        >
          <Icon
            className={experience.large ? "h-8 w-8 text-white" : "h-6 w-6 text-white"}
          />
        </div>

        {/* Title */}
        <h3
          className={`mb-1 font-bold text-white ${experience.large ? "text-2xl md:text-3xl" : "text-lg md:text-xl"}`}
        >
          {experience.title}
        </h3>

        {/* Tagline */}
        <p
          className={`leading-relaxed text-white/60 ${experience.large ? "text-base" : "text-sm"}`}
        >
          {experience.tagline}
        </p>
      </div>
    </div>
  );
}

export function ExperienceShowcase() {
  return (
    <section
      id="resort-experience"
      className="relative overflow-hidden bg-gradient-to-b from-[#0f2435] via-[#0b1c2e] to-[#0f2435] py-24"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322d3ee' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs">
            <Palmtree className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium text-cyan-100">
              Samal Island, Philippines
            </span>
          </div>
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
              The Resort Experience
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-cyan-100/70">
            Discover a lifestyle where every day feels like paradise
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:auto-rows-[180px]">
            {experiences.map((experience, index) => (
              <ExperienceCard
                key={experience.title}
                experience={experience}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
