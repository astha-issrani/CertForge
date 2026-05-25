const PREBUILT_TEMPLATES = [
  {
    _id: 'prebuilt-1',
    name: 'Classic Blue',
    description: 'Elegant classic certificate with navy blue and gold accents',
    isPrebuilt: true,
    design: {
      backgroundColor: '#f8f9fc',
      borderStyle: 'classic',
      borderColor: '#1a3a6c',
      accentColor: '#c9a84c',
      fontFamily: 'Georgia',
      layout: 'landscape'
    },
    content: {
      titleText: 'CERTIFICATE',
      subtitleText: 'of Achievement',
      presentedToText: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
      bodyText: 'in recognition of outstanding performance and dedication from {dateFrom} to {dateTo}. Your exceptional contributions have significantly advanced our team\'s success.',
      signerName: 'James Brookes',
      signerTitle: 'Director',
      organizationName: 'CertForge Academy'
    }
  },
  {
    _id: 'prebuilt-2',
    name: 'Royal Maroon',
    description: 'Prestigious certificate with deep maroon and silver styling',
    isPrebuilt: true,
    design: {
      backgroundColor: '#fdf8f8',
      borderStyle: 'elegant',
      borderColor: '#7b1c2f',
      accentColor: '#a8a8a8',
      fontFamily: 'Times New Roman',
      layout: 'landscape'
    },
    content: {
      titleText: 'CERTIFICATE',
      subtitleText: 'of Excellence',
      presentedToText: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
      bodyText: 'for demonstrating exceptional skills and commitment to excellence during the period from {dateFrom} to {dateTo}.',
      signerName: 'Sarah Johnson',
      signerTitle: 'President',
      organizationName: 'Royal Institute'
    }
  },
  {
    _id: 'prebuilt-3',
    name: 'Forest Green',
    description: 'Modern certificate with fresh green tones for completion awards',
    isPrebuilt: true,
    design: {
      backgroundColor: '#f5faf5',
      borderStyle: 'modern',
      borderColor: '#1e5c2e',
      accentColor: '#4caf50',
      fontFamily: 'Palatino Linotype',
      layout: 'landscape'
    },
    content: {
      titleText: 'CERTIFICATE',
      subtitleText: 'of Completion',
      presentedToText: 'THIS IS TO CERTIFY THAT',
      bodyText: 'has successfully completed the program requirements from {dateFrom} to {dateTo} with distinction and commendable effort.',
      signerName: 'Dr. Emily Chen',
      signerTitle: 'Program Director',
      organizationName: 'Green Valley Institute'
    }
  },
  {
    _id: 'prebuilt-4',
    name: 'Golden Prestige',
    description: 'Luxurious gold and dark certificate for top awards',
    isPrebuilt: true,
    design: {
      backgroundColor: '#1a1a2e',
      borderStyle: 'ornate',
      borderColor: '#c9a84c',
      accentColor: '#e8c96a',
      fontFamily: 'Garamond',
      layout: 'landscape'
    },
    content: {
      titleText: 'CERTIFICATE',
      subtitleText: 'of Honor',
      presentedToText: 'THIS CERTIFICATE IS BESTOWED UPON',
      bodyText: 'in highest recognition of extraordinary achievement and leadership demonstrated from {dateFrom} to {dateTo}.',
      signerName: 'William Sterling',
      signerTitle: 'Chairman',
      organizationName: 'Prestige Academy'
    }
  },
  {
    _id: 'prebuilt-5',
    name: 'Minimal Slate',
    description: 'Clean, modern minimal design for professional certifications',
    isPrebuilt: true,
    design: {
      backgroundColor: '#ffffff',
      borderStyle: 'minimal',
      borderColor: '#2d3748',
      accentColor: '#4a90e2',
      fontFamily: 'Helvetica',
      layout: 'landscape'
    },
    content: {
      titleText: 'CERTIFICATE',
      subtitleText: 'of Participation',
      presentedToText: 'THIS CERTIFIES THAT',
      bodyText: 'actively participated and contributed during the period from {dateFrom} to {dateTo}.',
      signerName: 'Alex Morgan',
      signerTitle: 'Coordinator',
      organizationName: 'SlateWorks'
    }
  }
];

module.exports = { PREBUILT_TEMPLATES };
