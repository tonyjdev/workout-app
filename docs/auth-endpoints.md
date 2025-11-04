# Autenticación API

Estos endpoints se exponen bajo `https://{tu-dominio}/api` y están protegidos por [Laravel Sanctum](https://laravel.com/docs/12.x/sanctum). Usa Postman o cualquier cliente HTTP con los ejemplos siguientes. Los cuerpos se envían en formato JSON y las respuestas devuelven `application/json`.

## Registro

- **Método**: `POST`
- **URL**: `/api/auth/register`
- **Body**:
  ```json
  {
    "name": "Casey Coach",
    "email": "casey@example.com",
    "password": "password",
    "password_confirmation": "password",
    "device_name": "postman" // opcional, nombre del dispositivo para el token
  }
  ```
- **Respuesta** `201 Created`:
  ```json
  {
    "token": "1|abc...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "Casey Coach",
      "email": "casey@example.com",
      "created_at": "2025-11-04T11:15:01+00:00",
      "updated_at": "2025-11-04T11:15:01+00:00"
    }
  }
  ```
- Guarda `token` para autorizar peticiones posteriores.

## Login

- **Método**: `POST`
- **URL**: `/api/auth/login`
- **Body**:
  ```json
  {
    "email": "casey@example.com",
    "password": "password",
    "device_name": "postman" // opcional
  }
  ```
- **Respuesta** `200 OK`:
  ```json
  {
    "token": "2|def...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "Casey Coach",
      "email": "casey@example.com",
      "created_at": "2025-11-04T11:15:01+00:00",
      "updated_at": "2025-11-04T11:15:01+00:00"
    }
  }
  ```

### Añadir token a Postman

1. Copia el valor de `token`.
2. En Postman, ve a **Authorization** de la petición protegida.
3. Selecciona tipo **Bearer Token**.
4. Pega el token en el campo **Token** (sin la palabra *Bearer*).
5. Postman enviará automáticamente la cabecera `Authorization: Bearer {token}`.

## Obtener usuario autenticado

- **Método**: `GET`
- **URL**: `/api/user`
- **Headers**:
  ```
  Authorization: Bearer {token}
  ```
- **Respuesta** `200 OK`:
  ```json
  {
    "id": 1,
    "name": "Casey Coach",
    "email": "casey@example.com",
    "created_at": "2025-11-04T11:15:01+00:00",
    "updated_at": "2025-11-04T11:15:01+00:00"
  }
  ```

## Logout

- **Método**: `DELETE`
- **URL**: `/api/auth/logout`
- **Headers**:
  ```
  Authorization: Bearer {token}
  ```
- **Respuesta** `204 No Content`
- El token usado queda revocado; repite el login para generar uno nuevo.

## Enviar enlace de recuperación de contraseña

- **Método**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Body**:
  ```json
  {
    "email": "casey@example.com"
  }
  ```
- **Respuesta** `200 OK`:
  ```json
  {
    "status": "We have emailed your password reset link!"
  }
  ```
- Se envía un correo con el token y enlace de reseteo definido por Laravel. Configura correctamente el driver de correo en `.env` (`MAIL_MAILER`, `MAIL_HOST`, etc.).

## Resetear contraseña

- **Método**: `POST`
- **URL**: `/api/auth/reset-password`
- **Body**:
  ```json
  {
    "token": "reset-token-del-correo",
    "email": "casey@example.com",
    "password": "new-password",
    "password_confirmation": "new-password"
  }
  ```
- **Respuesta** `200 OK`:
  ```json
  {
    "status": "Your password has been reset!"
  }
  ```
- Todos los tokens de acceso previos se invalidan al completar el reseteo.

## Errores comunes

- `422 Unprocessable Entity`: Fallo de validación. El cuerpo incluye `errors` con detalles.
- `401 Unauthorized`: Falta o token inválido. Confirma que usas el token actual en la cabecera `Authorization`.
- `429 Too Many Requests`: Sanitiza peticiones repetidas; aplica backoff exponencial.
