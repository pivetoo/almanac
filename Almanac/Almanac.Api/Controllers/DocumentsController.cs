using Archon.Api.Attributes;
using Archon.Api.Controllers;
using Archon.Core.Pagination;
using Almanac.Application.Localization;
using Almanac.Application.Models;
using Almanac.Application.Requests.Documents;
using Almanac.Application.Services;
using Almanac.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace Almanac.Api.Controllers
{
    [AccessArea("documents.area")]
    public sealed class DocumentsController : ApiControllerBase
    {
        private readonly IDocumentService documentService;
        private new IStringLocalizer<AlmanacResource> Localizer { get; }

        public DocumentsController(IDocumentService documentService, IStringLocalizer<AlmanacResource> localizer)
        {
            this.documentService = documentService;
            Localizer = localizer;
        }

        [RequireAccess("documents.get.description")]
        [GetEndpoint]
        public async Task<IActionResult> Get([FromQuery] PagedRequest request, [FromQuery] string? product, [FromQuery] string? module, CancellationToken cancellationToken)
        {
            PagedResult<Document> result = await documentService.GetDocuments(request, product, module, cancellationToken);
            return Http200(result);
        }

        [RequireAccess("documents.getById.description")]
        [GetEndpoint("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        {
            if (id <= 0)
            {
                return Http400(Localizer["request.id.required"]);
            }

            Document? entity = await documentService.GetDocumentById(id, cancellationToken);
            return entity is null ? Http404(Localizer["document.notFound"]) : Http200(entity);
        }

        [RequireAccess("documents.search.description")]
        [GetEndpoint]
        public async Task<IActionResult> Search([FromQuery] SearchDocumentsRequest request, CancellationToken cancellationToken)
        {
            List<DocumentSearchHit> hits = await documentService.Search(request, cancellationToken);
            return Http200(hits);
        }

        [RequireAccess("documents.versions.description")]
        [GetEndpoint("{id:long}/versions")]
        public async Task<IActionResult> Versions(long id, CancellationToken cancellationToken)
        {
            if (id <= 0)
            {
                return Http400(Localizer["request.id.required"]);
            }

            List<DocumentVersion> versions = await documentService.GetVersions(id, cancellationToken);
            return Http200(versions);
        }

        [RequireAccess("documents.create.description")]
        [PostEndpoint]
        public async Task<IActionResult> Create([FromBody] CreateDocumentRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Document document = await documentService.CreateDocument(request, cancellationToken);
            return Http201(document, Localizer["document.created"]);
        }

        [RequireAccess("documents.update.description")]
        [PutEndpoint("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateDocumentRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Document document = await documentService.UpdateDocument(id, request, cancellationToken);
            return Http200(document, Localizer["document.updated"]);
        }

        [RequireAccess("documents.setStatus.description")]
        [PutEndpoint("{id:long}/status")]
        public async Task<IActionResult> SetStatus(long id, [FromBody] SetDocumentStatusRequest request, CancellationToken cancellationToken)
        {
            IActionResult? validationResult = ValidateBody(request);
            if (validationResult is not null)
            {
                return validationResult;
            }

            Document document = await documentService.SetStatus(id, request, cancellationToken);
            return Http200(document, Localizer["document.statusUpdated"]);
        }

        [RequireAccess("documents.reindex.description")]
        [PostEndpoint]
        public async Task<IActionResult> Reindex(CancellationToken cancellationToken)
        {
            int updated = await documentService.Reindex(cancellationToken);
            return Http200(new { updated }, Localizer["document.reindexed"]);
        }

        [RequireAccess("documents.delete.description")]
        [DeleteEndpoint("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            Document? document = await documentService.Delete(id, cancellationToken);
            if (document is null)
            {
                return Http404(documentService.GetErrorMessages());
            }

            return Http200(document, Localizer["document.deleted"]);
        }
    }
}
