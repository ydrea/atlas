import {Link} from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type {ComponentProps} from "react";
import {Platform} from "react-native";

type LinkProps = ComponentProps<typeof Link>;
type ExternalLinkProps = Omit<LinkProps, "href"> & {href: string};

export function ExternalLink({
  href,
  onPress,
  ...props
}: ExternalLinkProps) {
  return (
    <Link
      {...props}
      href={href as LinkProps["href"]}
      onPress={(event) => {
        onPress?.(event);
        if (event.defaultPrevented || Platform.OS === "web") return;

        event.preventDefault();
        void WebBrowser.openBrowserAsync(href);
      }}
    />
  );
}
