import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Alexandra Kane",
      role: "Venture Capitalist",
      content:
        "The sleek, modern approach to fractional ownership is exactly what the luxury market needed. Exceptional returns.",
      rating: 5,
      image: "/professional-woman-in-dark-suit.jpg",
    },
    {
      name: "David Chen",
      role: "Tech Entrepreneur",
      content:
        "Cutting-edge investment platform with unmatched sophistication. The future of luxury real estate.",
      rating: 5,
      image: "/tech-executive-man.jpg",
    },
    {
      name: "Sophia Reeves",
      role: "Investment Director",
      content:
        "Dark elegance meets smart investing. This platform delivers on both luxury and performance.",
      rating: 5,
      image: "/elegant-businesswoman.jpg",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-[#0b1c2e] via-[#0d1f31] to-[#0f2435] py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Elite Owner Testimonials
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-cyan-50/90 md:text-xl">
            Trusted by the most sophisticated owners worldwide
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/40 to-[#0a1929]/40 p-8 backdrop-blur-sm transition-all hover:border-cyan-400/60 hover:shadow-xl hover:shadow-cyan-500/10"
            >
              <Quote className="mb-4 h-10 w-10 text-cyan-400/40" />

              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-cyan-400 text-cyan-400"
                  />
                ))}
              </div>

              <p className="mb-6 text-base leading-relaxed italic text-cyan-50/90">
                &quot;{testimonial.content}&quot;
              </p>

              <div className="flex items-center gap-3 border-t border-cyan-400/20 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-bold text-white">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-cyan-100">{testimonial.name}</h4>
                  <p className="text-sm text-cyan-300/70">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
