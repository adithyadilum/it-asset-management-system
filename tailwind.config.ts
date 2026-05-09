import type { Config } from "tailwindcss"

const textScales = [
    "xs",
    "sm",
    "base",
    "lg",
    "xl",
    "2xl",
    "3xl",
    "4xl",
    "5xl",
    "6xl",
    "7xl",
    "8xl",
    "9xl",
] as const

const textWeights = [
    "thin",
    "extra-light",
    "light",
    "regular",
    "medium",
    "semi-bold",
    "bold",
    "extra-bold",
    "black",
] as const

const figmaTextFonts = Object.fromEntries(
    textScales.flatMap((scale) =>
        textWeights.map((weight) => [
            `text-${scale}-${weight}`,
            `var(--text-${scale}-${weight}-font-family)`,
        ])
    )
)

const config = {
    darkMode: "class",
    content: [
        "./src/**/*.{ts,tsx,js,jsx,mdx}",
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                ...figmaTextFonts,
                sans: [
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                    '"Apple Color Emoji"',
                    '"Segoe UI Emoji"',
                    '"Segoe UI Symbol"',
                    '"Noto Color Emoji"',
                ],
            },
            boxShadow: {
                "box-shadow-destructive": "var(--box-shadow-destructive)",
                "box-shadow-focus-ring": "var(--box-shadow-focus-ring)",
                "box-shadow-shadow-2xl": "var(--box-shadow-shadow-2xl)",
                "box-shadow-shadow-2xs": "var(--box-shadow-shadow-2xs)",
                "box-shadow-shadow-lg": "var(--box-shadow-shadow-lg)",
                "box-shadow-shadow-md": "var(--box-shadow-shadow-md)",
                "box-shadow-shadow-none": "var(--box-shadow-shadow-none)",
                "box-shadow-shadow-sm": "var(--box-shadow-shadow-sm)",
                "box-shadow-shadow-xl": "var(--box-shadow-shadow-xl)",
                "box-shadow-shadow-xs": "var(--box-shadow-shadow-xs)",
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                status: {
                    new: "hsl(var(--status-new))",
                    assigned: "hsl(var(--status-assigned))",
                    lost: "hsl(var(--status-lost))",
                    disposed: "hsl(var(--status-disposed))",
                    repair: "hsl(var(--status-repair))",
                },
            },
            borderRadius: {
                none: "0px",
                xs: "2px",
                sm: "6px",
                md: "8px",
                lg: "10px",
                xl: "14px",
                "2xl": "18px",
                "3xl": "22px",
                "4xl": "26px",
                full: "9999px",
            },
            borderWidth: {
                DEFAULT: "1px",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
} satisfies Config

export default config
