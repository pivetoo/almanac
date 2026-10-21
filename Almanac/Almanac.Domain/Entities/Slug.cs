using System.Text.RegularExpressions;

namespace Almanac.Domain.Entities
{
    public static class Slug
    {
        private static readonly Regex Pattern = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

        public static string Normalize(string value)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(value);

            string normalized = value.Trim().ToLowerInvariant();
            if (!Pattern.IsMatch(normalized))
            {
                throw new ArgumentException("document.slug.invalidFormat", nameof(value));
            }

            return normalized;
        }
    }
}
