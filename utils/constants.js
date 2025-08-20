// src/utils/constants.js

module.exports = {
  HOTEL_NAME: "Nairobi Luxe Hotel",

  // Replace these with your actual Twilio Content Template SIDs
  TEMPLATE_IDS: {
    MAIN_MENU: "HX4cdeab44c242fff61b426df2bde3c80b",   // bookings-1 / events-2 / outdoor-3
    ROOM_MENU: "HXdc5616ce0031523554b7d70c5e3e4b4e",   // regular-101 / mid-size-102 / penthouse-103
    PACKAGE_MENU: "HX473b1ae69ead709efad025dad95438f3", // pkg1-201 / pkg2-202 / custom-203
  },

  // Room inventory & pricing (mock; replace with DB in production)
  ROOM_CATEGORIES: {
    "regular":   { units: 6,   price: 6500 },   // KES per night
    "mid-size":  { units: 4,   price: 9500 },
    "penthouse": { units: 2,   price: 18500 },
  },

  // Fallback texts (used when user enters unexpected input)
  MAIN_MENU_TEXT: [
    "Main menu:",
    "1) Bookings & Availability",
    "2) Corporate & Event Booking",
    "3) Outdoor Services"
  ].join("\n"),

  ROOM_MENU_TEXT: [
    "Choose a room category:",
    "101) Regular",
    "102) Mid-Size",
    "103) Penthouse"
  ].join("\n"),

  PACKAGES_TEXT: [
    "Corporate Packages:",
    "201) Package 1 — conference hall, snacks, internet access",
    "202) Package 2 — conference hall, three meals + snacks, internet",
    "203) Custom — tell us what you need"
  ].join("\n"),

  // Template numeric mappings (based on the numbers your templates return)
  MAIN_OPTIONS: { "1": "bookings_and_availability", "2": "event_booking", "3": "outdoor_service" },
  ROOM_OPTIONS: { "101": "regular", "102": "mid-size", "103": "penthouse" },
  PACKAGE_OPTIONS: { "201": "package1", "202": "package2", "203": "custom" }
};