# Upload privado com URL pré-assinada

## Escopo

deve ser possível:

- pedir uma URL de upload à API e receber uma key gerada pelo servidor;
- enviar o arquivo direto ao S3, sem nenhuma credencial AWS no cliente e sem passar pela API;
- ver o registro no banco sair de `PENDING` para `COMPLETED` sozinho, a partir do evento do S3 — sem o cliente avisar;
- pedir o arquivo de volta e receber uma URL de leitura com validade;

### Dentro

- Bucket privado, com Block Public Access e recusa de tráfego não-TLS
- `POST /uploads/presign` — registra metadados e devolve URL de `PUT`
- `GET /uploads/:id` — devolve URL de `GET` assinada
- Confirmação assíncrona via evento do S3

## Fluxos

### 1. Upload

```
Cliente                      API                        S3
  │                           │                          │
  │ POST /uploads/presign     │                          │
  │ {filename, contentType,   │                          │
  │  size}                    │                          │
  ├──────────────────────────▶│                          │
  │                           │ INSERT status=PENDING    │
  │                           │ key = uploads/{uuid}.ext │
  │                           │ assina PUT (15 min)      │
  │ {id, uploadUrl, objectKey}│                          │
  │◀──────────────────────────┤                          │
  │                                                      │
  │ PUT {uploadUrl}  (arquivo vai direto, sem passar pela API)
  ├─────────────────────────────────────────────────────▶│
```

### 2. Leitura

```
Cliente ──GET /uploads/:id──▶ API ──assina GET (15 min)──▶ {downloadUrl}
```

A URL é **computada na resposta**, nunca persistida.
