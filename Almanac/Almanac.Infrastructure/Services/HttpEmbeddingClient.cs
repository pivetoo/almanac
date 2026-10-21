using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Almanac.Application.Options;
using Almanac.Application.Services;
using Microsoft.Extensions.Options;

namespace Almanac.Infrastructure.Services
{
    public sealed class HttpEmbeddingClient : IEmbeddingClient
    {
        private readonly HttpClient httpClient;
        private readonly EmbeddingOptions options;

        public HttpEmbeddingClient(HttpClient httpClient, IOptions<EmbeddingOptions> options)
        {
            this.httpClient = httpClient;
            this.options = options.Value;
        }

        public bool IsConfigured => options.Enabled && !string.IsNullOrWhiteSpace(options.ApiKey);

        public async Task<float[]> Embed(string text, CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException("embeddings.notConfigured");
            }

            using HttpRequestMessage request = new(HttpMethod.Post, $"{options.BaseUrl.TrimEnd('/')}/embeddings");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
            request.Content = JsonContent.Create(new EmbeddingRequest(options.Model, text, options.Dimensions));

            using HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            EmbeddingResponse? payload = await response.Content.ReadFromJsonAsync<EmbeddingResponse>(cancellationToken);
            float[]? vector = payload?.Data.FirstOrDefault()?.Embedding;
            if (vector is null || vector.Length != options.Dimensions)
            {
                throw new InvalidOperationException("embeddings.invalidResponse");
            }

            return vector;
        }

        private sealed record EmbeddingRequest(
            [property: JsonPropertyName("model")] string Model,
            [property: JsonPropertyName("input")] string Input,
            [property: JsonPropertyName("dimensions")] int Dimensions);

        private sealed class EmbeddingResponse
        {
            [JsonPropertyName("data")]
            public List<EmbeddingItem> Data { get; set; } = [];
        }

        private sealed class EmbeddingItem
        {
            [JsonPropertyName("embedding")]
            public float[] Embedding { get; set; } = [];
        }
    }
}
