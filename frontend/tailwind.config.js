export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        screens: {
          '3xl': '1920px',
          'ultra': '2560px',
        },
        colors: {
          primary: '#252A34',
          secondary: '#2d3243',
          teal: '#08D9D6',
          pink: '#FF2E63',
          'text-main': '#EAEAEA',
          'text-muted': '#8892a4',
          border: '#363d52',
        }
      }
    },
    plugins: []
  }