# Hotmart MCP by Trazo Digital

Servidor MCP multiusuario para consultar datos de Hotmart desde ChatGPT.

## Estado
**Prototipo inicial (no apto todavía para producción).** El registro de usuarios, la provisión de tenants y la configuración del proveedor OAuth externo deben terminarse antes de conectarlo a cuentas reales. Los clientes de Hotmart aportan sus propias credenciales API. No se almacenan credenciales en GitHub.

## Arquitectura
- TypeScript, Express y MCP Streamable HTTP (sin sesiones persistentes).
- OAuth JWT firmado por un proveedor externo, con verificación de issuer, audience y scopes.
- PostgreSQL: tenants, memberships y conexiones aisladas.
- Cifrado AES-256-GCM de las credenciales Hotmart.
- Herramientas iniciales: listar conexiones, leer una página de ventas y resumir esa página.
- Acceso Hotmart exclusivamente desde el servidor; los datos personales de compradores no se devuelven en la herramienta de ventas.

## Arranque local
1. Instalar Node.js 22+ y ejecutar `npm install`.
2. Copiar `.env.example` a `.env` y configurar PostgreSQL, proveedor de identidad y URL HTTPS de publicación.
3. Aplicar `sql/001_init.sql` a una base PostgreSQL bajo una cuenta restringida.
4. Provisionar tenants y roles desde un proceso administrativo fiable (nunca desde solicitudes de usuarios).
5. Ejecutar `npm run build`, después `npm run dev`.

## Endpoints
- `GET /health`: comprobación de proceso (no valida integraciones).
- `GET /.well-known/oauth-protected-resource`: metadata OAuth del recurso.
- `POST /mcp`: endpoint MCP, requiere `hotmart:read`.
- `GET /api/connections`: listar conexiones autorizadas.
- `POST /api/connections`: añadir credenciales Hotmart, requiere `hotmart:manage` y rol admin/owner.

## Seguridad
Cada consulta filtra por el sujeto JWT y una membership válida; no se admite seleccionar arbitrariamente el tenant de otro usuario. No subir `.env`, secretos ni datos reales. Requiere auditoría, políticas de retención, rate limiting, revocación y revisión de publicación antes de uso comercial.

## Documentación
- https://developers.hotmart.com/docs/es/
- https://modelcontextprotocol.io/
