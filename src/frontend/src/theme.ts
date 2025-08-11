import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

const theme = extendTheme({
  config,
  semanticTokens: {
    colors: {
      // Main background
      'app-bg': {
        default: 'white',
        _dark: 'gray.900',
      },
      'card-bg': {
        default: 'white',
        _dark: 'gray.800',
      },
      
      // Text colors
      'text-primary': {
        default: 'gray.700',
        _dark: 'gray.100',
      },
      'text-secondary': {
        default: 'gray.600',
        _dark: 'gray.200',
      },
      'text-muted': {
        default: 'gray.500',
        _dark: 'gray.400',
      },
      'text-disabled': {
        default: 'gray.400',
        _dark: 'gray.500',
      },
      'text-connection': {
        default: 'gray.600',
        _dark: 'gray.300',
      },
      'text-code': {
        default: 'gray.700',
        _dark: 'gray.200',
      },
      
      // Borders and dividers
      'border-primary': {
        default: 'gray.100',
        _dark: 'gray.600',
      },
      'border-secondary': {
        default: 'gray.300',
        _dark: 'gray.500',
      },
      'divider': {
        default: 'gray.200',
        _dark: 'gray.600',
      },
      
      // Form elements
      'input-bg': {
        default: 'white',
        _dark: 'gray.700',
      },
      'input-border': {
        default: 'gray.100',
        _dark: 'gray.600',
      },
      'input-border-hover': {
        default: 'gray.400',
        _dark: 'gray.500',
      },
      'input-border-focus': {
        default: 'blue.500',
        _dark: 'blue.400',
      },
      'select-bg': {
        default: 'white',
        _dark: 'gray.600',
      },
      'select-border': {
        default: 'gray.200',
        _dark: 'gray.500',
      },
      'select-border-hover': {
        default: 'gray.500',
        _dark: 'gray.400',
      },
      'select-border-focus': {
        default: 'gray.600',
        _dark: 'gray.300',
      },
      
      // Code and preview
      'code-bg': {
        default: 'gray.50',
        _dark: 'gray.900',
      },
      'code-border': {
        default: 'gray.200',
        _dark: 'gray.700',
      },
      
      // Icons and interactive elements
      'search-icon': {
        default: 'gray.300',
        _dark: 'gray.500',
      },
      'expand-icon': {
        default: 'gray.400',
        _dark: 'gray.500',
      },
      'expand-icon-hover': {
        default: 'gray.600',
        _dark: 'gray.300',
      },
      
      // Table and list items
      'table-header-bg': {
        default: 'white',
        _dark: 'gray.750',
      },
      'table-row-hover': {
        default: 'gray.50',
        _dark: 'gray.700',
      },
      'selected-row-bg': {
        default: 'blue.50',
        _dark: 'blue.900',
      },
      'child-row-bg': {
        default: 'gray.25',
        _dark: 'gray.750',
      },
      'disabled-row-bg': {
        default: 'gray.100',
        _dark: 'gray.700',
      },
      'hover-bg': {
        default: 'gray.50',
        _dark: 'gray.700',
      },
      
      // Button colors
      'neutral-button': {
        default: 'gray.200',
        _dark: 'gray.600',
      },
      'neutral-button-text': {
        default: 'gray.700',
        _dark: 'gray.100',
      },
      'neutral-button-hover': {
        default: 'gray.300',
        _dark: 'gray.500',
      },
      
      // Mode selector colors
      'mode-selector-bg': {
        default: 'white',
        _dark: 'gray.900',
      },
      'mode-selector-text': {
        default: 'gray.700',
        _dark: 'gray.200',
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'app-bg',
        color: 'text-primary',
      },
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: 'card-bg',
          borderColor: 'border-primary',
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          bg: 'input-bg',
          borderColor: 'input-border',
          _hover: {
            borderColor: 'input-border-hover',
          },
          _focus: {
            borderColor: 'input-border-focus',
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          bg: 'select-bg',
          borderColor: 'select-border',
          _hover: {
            borderColor: 'select-border-hover',
          },
          _focus: {
            borderColor: 'select-border-focus',
          },
        },
      },
    },
    Code: {
      baseStyle: {
        bg: 'code-bg',
        color: 'text-code',
        borderColor: 'code-border',
      },
    },
    Table: {
      variants: {
        simple: {
          th: {
            bg: 'table-header-bg',
            borderColor: 'border-primary',
          },
          td: {
            borderColor: 'border-primary',
          },
          tr: {
            _hover: {
              bg: 'table-row-hover',
            },
          },
        },
      },
    },
  },
})

export default theme
