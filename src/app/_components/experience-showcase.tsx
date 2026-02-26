"use client";

import Image from "next/image";
import { Palmtree } from "lucide-react";

interface Experience {
  src: string;
  alt: string;
  title: string;
  tagline: string;
  /** CSS grid placement on md+ */
  gridClass: string;
  /** Focus point for object-position */
  objectPosition?: string;
}

const experiences: Experience[] = [
  {
    src: "/showcase/Reefresort-11.jpg",
    alt: "Sunset view from glamping tent over the ocean",
    title: "Golden Sunsets",
    tagline: "End every day in paradise",
    gridClass: "md:[grid-column:1/3] md:[grid-row:1/3]",
  },
  {
    src: "/showcase/Reefresort-5.jpg",
    alt: "Glamping tent interior with ocean view",
    title: "Overwater Glamping",
    tagline: "Wake up to the sound of waves",
    gridClass: "md:[grid-column:3/5] md:[grid-row:1/2]",
    objectPosition: "center 65%",
  },
  {
    src: "/showcase/WaterActivity-5.jpg",
    alt: "Crystal clear kayaking in turquoise waters",
    title: "Crystal Waters",
    tagline: "Explore pristine blue seas",
    gridClass: "md:[grid-column:3/4] md:[grid-row:2/3]",
    objectPosition: "center 70%",
  },
  {
    src: "/showcase/WaterActivity-3.jpg",
    alt: "Paddleboarding on calm ocean",
    title: "Paddleboarding",
    tagline: "Glide across the open water",
    gridClass: "md:[grid-column:4/5] md:[grid-row:2/3]",
    objectPosition: "center 55%",
  },
  {
    src: "/showcase/Reefresort-17.jpg",
    alt: "Luxury floating tent bedroom with string lights",
    title: "Luxury Stays",
    tagline: "Curated comfort on the sea",
    gridClass: "md:[grid-column:1/2] md:[grid-row:3/5]",
  },
  {
    src: "/showcase/WaterActivity-1.jpg",
    alt: "Dragon banana boat ride with guests",
    title: "Thrilling Rides",
    tagline: "Adventures for everyone",
    gridClass: "md:[grid-column:2/3] md:[grid-row:3/4]",
    objectPosition: "center center",
  },
  {
    src: "/showcase/Reefresort-2.jpg",
    alt: "Ocean view from glamping tent deck",
    title: "Ocean Front Deck",
    tagline: "Your private sea view",
    gridClass: "md:[grid-column:2/3] md:[grid-row:4/5]",
    objectPosition: "center 30%",
  },
  {
    src: "/showcase/WaterActivity-8.jpg",
    alt: "Water bike on the dock with ocean panorama",
    title: "Water Sports",
    tagline: "Bikes, kayaks & more",
    gridClass: "md:[grid-column:3/5] md:[grid-row:3/5]",
    objectPosition: "center 60%",
  },
];

function ExperienceCard({
  experience,
  index,
}: {
  experience: Experience;
  index: number;
}) {
  const isLarge =
    experience.gridClass.includes("1/3]") ||
    experience.gridClass.includes("3/5]");

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl md:rounded-3xl ${experience.gridClass}`}
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "backwards",
      }}
    >
      {/* Photo */}
      <Image
        src={experience.src}
        alt={experience.alt}
        fill
        sizes={isLarge ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
        className="object-cover transition-transform duration-700 group-hover:scale-110"
        style={{
          objectPosition: experience.objectPosition ?? "center center",
        }}
      />

      {/* Gradient overlay — stronger at bottom for text readability */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 rounded-2xl border border-white/0 transition-all duration-300 group-hover:border-cyan-400/30 md:rounded-3xl" />

      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col justify-end ${isLarge ? "p-6 md:p-8" : "p-4 md:p-6"}`}
      >
        <h3
          className={`font-bold text-white ${isLarge ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}
        >
          {experience.title}
        </h3>
        <p
          className={`mt-0.5 text-white/70 ${isLarge ? "text-sm md:text-base" : "text-xs md:text-sm"}`}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:auto-rows-[200px] md:gap-4">
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
