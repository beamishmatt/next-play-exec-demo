"use client";

import { useTheme } from "../ThemeProvider";
import { useActionBar } from "../ActionBarProvider";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();
  const { isActionBarVisible } = useActionBar();

  // Calculate position based on ActionBar visibility
  // ActionBar is positioned at bottom: 32px, so toasts should be 16px above it
  // ActionBar height is approximately 48px (based on py-1.5 + button height)
  // So: 32px (ActionBar bottom) + 48px (ActionBar height) + 16px (gap) = 96px from bottom
  const toasterPosition = isActionBarVisible ? '96px' : '32px';

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      closeButton={false}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--toast-bottom": toasterPosition,
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          bottom: toasterPosition,
        },
        closeButton: false, // Disable native close button
      }}
      {...props}
    />
  );
};

export { Toaster };