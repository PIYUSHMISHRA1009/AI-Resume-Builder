import { BookUserIcon } from "lucide-react"
import Title from "./Title"

const Testimonial = () => {
  const cardsData = [
    {
      image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200",
      name: "Briar Martin",
      handle: "@neilstellar",
      date: "April 20, 2025",
    },
    {
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
      name: "Avery Johnson",
      handle: "@averywrites",
      date: "May 10, 2025",
    },
    {
      image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=60",
      name: "Jordan Lee",
      handle: "@jordantalks",
      date: "June 5, 2025",
    },
    {
      image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=60",
      name: "Avery Johnson",
      handle: "@averywrites",
      date: "May 10, 2025",
    },
  ]

  const doubledCards = [...cardsData, ...cardsData]

  return (
    <div
      id="testimonials"
      className="flex flex-col items-center my-10 scroll-mt-12"
    >
      {/* 🔹 Marquee animation styles (RESTORED) */}
      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        .marquee-inner {
          animation: marqueeScroll 25s linear infinite;
        }

        .marquee-reverse {
          animation-direction: reverse;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-400/10 rounded-full px-6 py-1.5">
        <BookUserIcon className="size-4.5 stroke-green-600" />
        <span>Testimonials</span>
      </div>

      <Title
        title="Don't just take our words"
        description="Hear what our users say about us. We're always looking for ways to improve. If you have a positive experience with us, leave a review."
      />

      {/* Row 1 */}
      <div className="w-full mx-auto max-w-5xl overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-20 z-10 bg-linear-to-r from-white to-transparent" />
        <div className="marquee-inner flex min-w-[200%] pt-10 pb-5">
          {doubledCards.map((card, index) => (
            <TestimonialCard key={`row1-${index}`} card={card} />
          ))}
        </div>
        <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 bg-linear-to-l from-white to-transparent" />
      </div>

      {/* Row 2 (reverse direction) */}
      <div className="w-full mx-auto max-w-5xl overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-20 z-10 bg-linear-to-r from-white to-transparent" />
        <div className="marquee-inner marquee-reverse flex min-w-[200%] pt-5 pb-10">
          {doubledCards.map((card, index) => (
            <TestimonialCard key={`row2-${index}`} card={card} />
          ))}
        </div>
        <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 bg-linear-to-l from-white to-transparent" />
      </div>
    </div>
  )
}

const TestimonialCard = ({ card }) => {
  return (
    <div className="p-4 rounded-lg mx-4 shadow hover:shadow-lg transition-all duration-200 w-72 shrink-0 bg-white">
      <div className="flex gap-2">
        <img
          className="size-11 rounded-full"
          src={card.image}
          alt={card.name}
        />
        <div>
          <p className="font-medium">{card.name}</p>
          <span className="text-xs text-slate-500">{card.handle}</span>
        </div>
      </div>

      <p className="text-sm py-4 text-gray-800">
        Radiant made undercutting all of our competitors an absolute breeze.
      </p>

      <div className="flex justify-between text-xs text-slate-500">
        <span>Posted on</span>
        <p>{card.date}</p>
      </div>
    </div>
  )
}

export default Testimonial
