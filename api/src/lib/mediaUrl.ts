const insecureHttpProtocolPattern = /^http:\/\//i;

// Media can come from stored absolute URLs or generated signed URLs.
// Force those values onto HTTPS so the browser never treats branding,
// avatars, or win media as mixed content when the app itself is secure.
export const forceHttpsMediaUrl = (value: string | null | undefined) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
        return null;
    }

    return insecureHttpProtocolPattern.test(trimmedValue)
        ? trimmedValue.replace(insecureHttpProtocolPattern, 'https://')
        : trimmedValue;
};
