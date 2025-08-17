import { Href, Link } from 'expo-router';
// Removed expo-web-browser - keeping web behavior only
import { type ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (Platform.OS !== 'web') {
          // Note: Native apps now use reader mode for articles
          // This component is for general external links only
          event.preventDefault();
          console.warn('ExternalLink: Consider using router navigation for article links');
        }
      }}
    />
  );
}
