# Propuesta técnica: reducción de bots y leads basura en botón de WhatsApp

## Contexto
- App web desplegada en **Vercel**
- Botón **“Contactar por WhatsApp”**
- Métricas infladas de clicks
- Mensajes de WhatsApp irrelevantes / spam
- Pixel de Facebook registra `Lead` en el click

## Diagnóstico
- Un **click ≠ Lead**
- El evento `Lead` se está disparando **demasiado temprano**
- Facebook optimiza campañas para **quien hace clicks**, no para contactos reales
- Bots y usuarios de baja intención entrenan mal el algoritmo

---

## Objetivo
1. Reducir tráfico bot / spam
2. Definir correctamente qué es un **Lead**
3. Emitir eventos confiables para Meta Ads
4. Mantener buena UX

---

## Principio clave
> **Cuanto más valioso es el evento, más tarde y más server-side debe emitirse.**

---

## Arquitectura propuesta (alto nivel)

```
Usuario
  ↓ click
Frontend (Next.js)
  ↓ captcha token
API propia (Vercel)
  ↓ validaciones
  ↓ emitir Lead (CAPI)
Redirect a WhatsApp
```

---

## 1️⃣ Eliminar link directo a WhatsApp
❌ No usar:
```
<a href="https://wa.me/...">
```

✅ Usar:
- Botón que llama a `POST /api/contact/whatsapp`
- La API decide si redirige o no

**Beneficio:** bots simples no pasan este flujo.

---

## 2️⃣ reCAPTCHA v3 (invisible)

### Qué es
- Servicio de Google
- No muestra desafíos al usuario
- Devuelve un **score (0–1)** de probabilidad de ser humano

### Flujo
1. FE solicita token:
   ```js
   grecaptcha.execute(SITE_KEY, { action: 'contact_whatsapp' })
   ```
2. FE envía token a la API
3. API valida token con Google
4. Google responde con:
   - `success`
   - `score`
   - `action`

### Decisión
Ejemplo:
```
score ≥ 0.6 → permitir
score < 0.6 → bloquear o fallback
```

### Costos
- **Gratis hasta ~10.000 validaciones/mes**
- Billing solo si se supera el free tier

---

## 3️⃣ Rate limiting
Aplicar en la API:
- Máx. **5 intentos / 10 minutos / IP**
- Guardar contadores en KV / Redis (ej. Upstash)

**Complementa al captcha.**

---

## 4️⃣ Emisión correcta del evento Lead

### ❌ Incorrecto (actual)
```
Click FE → fbq('Lead')
```

### ✅ Correcto (propuesto)
```
API valida captcha + rate limit → emitir Lead
```

### Cómo emitir
- Usar **Meta Conversions API (CAPI)**
- Server-to-server
- No depende del navegador
- Mucho más confiable

---

## 5️⃣ Eventos recomendados

| Evento | Dónde | Uso |
|------|------|----|
| PageView | FE | Audiencias |
| ViewContent | FE | Audiencias |
| ContactClick | FE (custom) | Métrica interna |
| Lead | API (CAPI) | Optimización Ads |
| Purchase | API | Optimización Ads |

---

## 6️⃣ Texto prellenado + referencia
Redirigir a WhatsApp con texto obligatorio:

```
Hola, quiero info (ref: A7F3K)
```

- Permite filtrar spam
- Correlacionar click → mensaje
- Mejora reporting

---

## 7️⃣ Estrategia de rollout

### Fase 1 (rápida)
- Endpoint intermedio
- Rate limit
- Texto prellenado

### Fase 2
- reCAPTCHA v3
- Mover Lead a backend

### Fase 3
- Métricas limpias
- Reporte al cliente basado en leads validados

---

## Beneficios esperados
- ↓ 70–90% de spam
- ↓ clicks inflados
- ↑ calidad de leads
- ↑ eficiencia de campañas Meta Ads

---

## Mensaje simple para el cliente
> “Antes contábamos leads cuando alguien tocaba un botón.  
> Ahora solo contamos leads cuando el sistema valida que es una persona real.”

---

## Conclusión
- El problema **no es Facebook**
- El problema **no es WhatsApp**
- El problema es **cuándo y dónde se define un Lead**

Mover el Lead al backend + captcha cambia completamente la calidad del sistema.
