export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export const sectionScrollClass = "scroll-mt-24";
