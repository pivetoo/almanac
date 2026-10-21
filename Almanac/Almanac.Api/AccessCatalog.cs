using Archon.Api.Attributes;

[assembly: AccessCatalog(
    Modules = ["documentos", "catalogo"],
    Verbs = ["ver", "editar", "revisar", "excluir"])]
