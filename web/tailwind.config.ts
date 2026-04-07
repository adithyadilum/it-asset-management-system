import type { Config } from "tailwindcss";

const config = {
    darkMode: "class",
    content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
    theme: {
        extend: {
            colors: {
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
        },
    },
    plugins: [],
} satisfies Config;

export default config;
