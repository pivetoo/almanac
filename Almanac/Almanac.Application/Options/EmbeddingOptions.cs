namespace Almanac.Application.Options
{
    public sealed class EmbeddingOptions
    {
        public const string SectionName = "Embeddings";

        public bool Enabled { get; set; }

        public string BaseUrl { get; set; } = "https://api.openai.com/v1";

        public string ApiKey { get; set; } = string.Empty;

        public string Model { get; set; } = "text-embedding-3-small";

        public int Dimensions { get; set; } = 1536;

        public double MaxDistance { get; set; } = 0.55;
    }
}
