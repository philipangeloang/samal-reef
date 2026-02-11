export const GALLERY_COLLECTIONS = {
  glamphouse: {
    name: "Glamp House",
    description: "Luxurious glamping experience with ocean views",
    images: [
      "/glamphouse/Glamp1.jpg",
      "/glamphouse/Glamp2.jpg",
      "/glamphouse/Glamp3.jpg",
      "/glamphouse/Glamp4.jpg",
      "/glamphouse/Glamp5.jpg",
      "/glamphouse/OGlamp1.jpg",
      "/glamphouse/OGlamp2.jpg",
    ],
  },
  arkpad: {
    name: "Arkpad",
    description: "Luxurious glamping experience with ocean views",
    images: [
      "/arkpad/Ark1.jpg",
      "/arkpad/Ark2.jpg",
      "/arkpad/Ark3.jpg",
      "/arkpad/Ark4.jpg",
      "/arkpad/Ark5.jpg",
      "/arkpad/Ark6.jpg",
      "/arkpad/Ark7.jpg",
      "/arkpad/Ark8.jpg",
    ],
  },
} as const;

export type GalleryCollectionKey = keyof typeof GALLERY_COLLECTIONS;
