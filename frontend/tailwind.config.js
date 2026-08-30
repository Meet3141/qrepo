/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
        "colors": {
            "primary-fixed-dim": "#b4c5ff",
            "primary": "#004ac6",
            "surface-container-low": "#f3f3fe",
            "secondary-fixed-dim": "#b7c8e1",
            "on-secondary-fixed-variant": "#38485d",
            "on-surface-variant": "#434655",
            "surface-container-lowest": "#ffffff",
            "tertiary": "#943700",
            "on-secondary-fixed": "#0b1c30",
            "on-tertiary-fixed-variant": "#7d2d00",
            "on-tertiary": "#ffffff",
            "surface-container-highest": "#e1e2ed",
            "on-primary-fixed-variant": "#003ea8",
            "inverse-primary": "#b4c5ff",
            "secondary-container": "#d0e1fb",
            "secondary": "#505f76",
            "inverse-surface": "#2e3039",
            "on-background": "#191b23",
            "surface-container": "#ededf9",
            "on-secondary-container": "#54647a",
            "on-secondary": "#ffffff",
            "surface-tint": "#0053db",
            "surface-variant": "#e1e2ed",
            "on-primary-container": "#eeefff",
            "tertiary-fixed": "#ffdbcd",
            "tertiary-container": "#bc4800",
            "on-primary-fixed": "#00174b",
            "on-tertiary-container": "#ffede6",
            "outline-variant": "#c3c6d7",
            "error": "#ba1a1a",
            "tertiary-fixed-dim": "#ffb596",
            "error-container": "#ffdad6",
            "surface": "#faf8ff",
            "on-surface": "#191b23",
            "on-error": "#ffffff",
            "outline": "#737686",
            "on-primary": "#ffffff",
            "inverse-on-surface": "#f0f0fb",
            "background": "#faf8ff",
            "on-tertiary-fixed": "#360f00",
            "primary-container": "#2563eb",
            "surface-bright": "#faf8ff",
            "surface-dim": "#d9d9e5",
            "secondary-fixed": "#d3e4fe",
            "on-error-container": "#93000a",
            "primary-fixed": "#dbe1ff",
            "surface-container-high": "#e7e7f3"
        },
        "borderRadius": {
            "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
        },
        "spacing": {
            "sm": "8px",
            "margin-mobile": "16px",
            "gutter": "24px",
            "xs": "4px",
            "base": "4px",
            "lg": "24px",
            "xl": "32px",
            "md": "16px",
            "container-max": "1280px"
        },
        "fontFamily": {
            "headline-lg-mobile": ["Inter"],
            "body-md": ["Inter"],
            "body-lg": ["Inter"],
            "label-sm": ["Inter"],
            "headline-lg": ["Inter"],
            "display": ["Inter"],
            "label-md": ["Inter"],
            "headline-md": ["Inter"]
        },
        "fontSize": {
            "headline-lg-mobile": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
            "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0", "fontWeight": "400" }],
            "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0", "fontWeight": "400" }],
            "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }],
            "headline-lg": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
            "display": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
            "label-md": ["13px", { "lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "500" }],
            "headline-md": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }]
        }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}

