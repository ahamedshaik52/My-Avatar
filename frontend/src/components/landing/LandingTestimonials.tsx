"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    avatar: "SC",
    color: "bg-avatar-purple",
    quote: "My Avatar cut my video production time from days to hours. The lip sync is incredibly accurate and the voices sound completely natural.",
    stars: 5,
  },
  {
    name: "Marcus Rivera",
    role: "Marketing Director",
    avatar: "MR",
    color: "bg-avatar-cyan",
    quote: "We use My Avatar to create training videos for our global team in 12 different languages. The quality blew our executives away.",
    stars: 5,
  },
  {
    name: "Priya Patel",
    role: "Online Educator",
    avatar: "PP",
    color: "bg-avatar-pink",
    quote: "I'm not on camera-comfortable, but with My Avatar I can deliver my entire course without ever showing my face. Game changer.",
    stars: 5,
  },
  {
    name: "James O'Brien",
    role: "Startup Founder",
    avatar: "JO",
    color: "bg-green-600",
    quote: "From investor pitches to product demos — we generate everything with My Avatar. The 4K quality makes us look world-class.",
    stars: 5,
  },
  {
    name: "Amara Diallo",
    role: "Social Media Manager",
    avatar: "AD",
    color: "bg-orange-500",
    quote: "The voice cloning feature is honestly magical. I uploaded a 30-second sample and it sounds exactly like me. Our audience loves it.",
    stars: 5,
  },
  {
    name: "Tom Nakamura",
    role: "E-learning Producer",
    avatar: "TN",
    color: "bg-blue-600",
    quote: "Competitor tools produced robotic-looking results. My Avatar's motion smoothing and color grading make videos look truly cinematic.",
    stars: 5,
  },
];

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-avatar-pink/30 bg-avatar-pink/10 text-avatar-pink-light text-sm font-medium mb-4">
            Loved by creators
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Join <span className="gradient-text">10,000+ creators</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From solo creators to enterprise teams — see what they're building.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card rounded-xl p-6 hover:border-avatar-purple/30 transition-colors duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-bold text-white`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
