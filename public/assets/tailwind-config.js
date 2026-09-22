tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#242621',
          light: '#F9F9F7',
          accent: '#B68B5D',
          accentHover: '#9b744a',
          text: '#1D1F1A',
          mutetext: '#64685D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      letterSpacing: {
        tightest: '-.04em',
        tighter: '-.02em',
        widest: '.2em',
      },
    },
  },
};
