# Volvo

Esta integración lleva su **Volvo** a Gladys a través de las API oficiales de Volvo Cars: batería o combustible, autonomía, carga, cierre, puertas y ventanillas, climatización, posición, mantenimiento y alertas. También ofrece escenas (coche desbloqueado, dejado abierto, carga completada, llegada a casa…) y un widget del panel con la foto de su coche.

Coches compatibles: modelos a partir de 2010 en los que funciona la aplicación Volvo Cars, en Europa, Oriente Medio, África, Estados Unidos, Canadá y Latinoamérica ([lista de países](https://developer.volvocars.com/terms-and-conditions/apis-supported-locations/)). Los datos disponibles dependen del modelo, del año y del país.

> Integración comunitaria, sin vínculo con Volvo Cars ni respaldada por Volvo Cars.

## Configuración

La configuración lleva unos diez minutos, una sola vez. Se realiza en el **portal para desarrolladores de Volvo**, con el Volvo ID de su coche (el de la aplicación Volvo Cars).

### 1. Crear una aplicación de API

1. Abra el [portal para desarrolladores de Volvo](https://developer.volvocars.com/), cree una cuenta o inicie sesión con su Volvo ID.
2. Vaya a [My API applications](https://developer.volvocars.com/account/#your-api-applications) y cree una **API application** (cualquier nombre, por ejemplo «Gladys»).
3. Copie su **VCC API key** (la clave principal) en el campo del mismo nombre de la integración.

Cada aplicación tiene una **cuota diaria de solicitudes**: con varios coches, lo más cómodo es una aplicación por coche (y por tanto una instalación por cuenta), o un intervalo de lectura más largo.

### 2. Publicar la aplicación

Es lo que permite a Gladys iniciar sesión con su Volvo ID.

1. Debajo de su aplicación, haga clic en **Publish**.
2. Rellene el formulario. Dos puntos importantes:
   - **Scopes**: márquelos **todos** (despliegue cada sección). Si falta un scope, el inicio de sesión falla.
   - **Redirect URI**: añada la dirección que Gladys muestra junto al botón **Conectar** de la integración (por defecto `https://my.gladysassistant.com/redirect/oauth`). Volvo solo acepta direcciones HTTPS: esta página de Gladys devuelve su navegador a su instancia, aunque acceda a ella por `http://` en su red local.
3. Haga clic en **View summary** y confirme.
4. Copie el **client ID** y el **client secret** que se muestran en los campos del mismo nombre de la integración y luego **guarde**.

### 3. Iniciar sesión

1. Haga clic en **Conectar**: se abre la página de Volvo ID.
2. Inicie sesión (Volvo le envía un código por correo electrónico) y autorice el acceso.
3. Vuelve a Gladys: la pantalla de configuración indica «Conectado a Volvo: 1 coche(s).»

El botón **Probar la conexión** comprueba la clave y el inicio de sesión, y lista los coches de la cuenta.

### Opciones

| Campo                    | Función                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intervalo de lectura** | 5 minutos por defecto (de 2 a 60): cierre, puertas, batería, carga, posición. También determina la rapidez con la que reaccionan las escenas                  |
| **Radio de la vivienda** | 200 m por defecto: más cerca, el coche está «en casa» (distancia desde casa, escenas de llegada y salida)                                                     |
| **Idioma de los textos** | Automático por defecto (el idioma de su panel): nombres de dispositivos, estado de la carga, alertas, resúmenes de escenas. Inglés, francés, alemán o español |

El mantenimiento, las alertas, el cuentakilómetros y los neumáticos se leen cada 30 minutos. A 5 minutos, cuente con unas 2.000 solicitudes al día por coche.

### Renovar el inicio de sesión

Volvo limita en el tiempo la autorización de una aplicación publicada para uso personal. Cuando termina, Gladys deja de leer, la pantalla de configuración indica «Volvo ha revocado la autorización» y se dispara el activador **Volvo: nuevo inicio de sesión necesario** (útil para recibir una notificación). Basta con volver a hacer clic en **Conectar**.

## Añadir el coche

En la pestaña **Descubrir**, cada coche de la cuenta aparece como un dispositivo «Volvo _modelo_ (_año_)». Añádalo y asígnelo a una habitación. El widget y las escenas también funcionan sin el dispositivo, pero para elegir el coche en sus ajustes se usa la lista de dispositivos.

Las funciones dependen de lo que transmite el coche: un coche de gasolina no tiene batería ni carga, un coche sin techo solar no tiene techo solar. Si falta un valor justo después de la instalación (coche no utilizado desde entonces), vuelva a buscar más tarde.

## Las funciones del coche

| Función                                                                 | Valor                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Batería**, **Autonomía eléctrica**                                    | coches eléctricos e híbridos enchufables                                                              |
| **Energía en la batería**                                               | calculada a partir de la capacidad de la batería                                                      |
| **Cable de carga enchufado**, **Estado de la carga**                    | enchufado o no; cargando, completada, programada…                                                     |
| **Potencia de carga**, **Tiempo de carga restante**                     | según el modelo                                                                                       |
| **Objetivo de carga**, **Límite de la corriente de carga**              | solo lectura: Volvo no permite modificarlos                                                           |
| **Combustible**, **Autonomía de combustible**                           | coches de gasolina, diésel e híbridos                                                                 |
| **Consumo medio**                                                       | kWh/100 km, desde la puesta a cero del cuentakilómetros parcial                                       |
| **Cuentakilómetros**                                                    | distancia total                                                                                       |
| **Bloqueo**                                                             | 1 = bloqueado; se controla desde Gladys cuando el coche lo permite                                    |
| **Puertas**, **Portón trasero**, **Capó**, **Tapa del depósito**        | 1 = abierto; «Puertas» agrupa las cuatro puertas                                                      |
| **Ventanillas**, **Techo solar**                                        | 1 = abierto; «Ventanillas» agrupa las cuatro ventanillas                                              |
| **Climatización**                                                       | enciende o apaga la climatización a distancia (ver más abajo)                                         |
| **Distancia hasta el mantenimiento**, **Tiempo hasta el mantenimiento** | en km y en días                                                                                       |
| **Alertas**                                                             | texto: «Ninguna», o la lista (neumático, nivel de aceite, limpiaparabrisas, bombilla, mantenimiento…) |
| **Distancia desde casa**                                                | en km, si el coche transmite su posición y su vivienda está localizada en Gladys                      |

Se conserva el historial: gráfico del nivel de batería, del cuentakilómetros… Las escenas habituales sobre el valor de un dispositivo funcionan («batería por debajo del 20 %», «ventanilla abierta»…).

**Climatización**: Volvo no indica si la climatización está en marcha. Gladys muestra el último comando y vuelve a apagado al cabo de 30 minutos.

**Comandos**: Volvo responde una vez que el coche ha ejecutado la orden, lo que puede tardar hasta un minuto (coche en reposo). Gladys envía el comando en segundo plano y vuelve a leer el coche unos veinte segundos después.

**Insignia Nube**: en la pantalla **Dispositivos**, cada coche lleva una insignia **Nube** mientras Volvo responde por él, e **Inaccesible** cuando ninguna lectura tiene éxito. Un punto naranja significa que, según Volvo, el coche no puede ejecutar órdenes remotas en este momento (sin conexión, coche en uso, modo de ahorro de energía, actualización de software): pase el ratón sobre la insignia para leer el motivo.

**Actualización desde la 1.0.x**: las funciones **Autonomía de combustible** y **Distancia hasta el mantenimiento** no tenían icono en Gladys. Para obtenerlo, abra la pestaña **Descubrir** y haga clic en **Actualizar** en su coche. Se conservan el historial, la habitación y las escenas; un coche no actualizado sigue funcionando como antes.

## Escenas: activadores

En el editor de escenas, sección **Volvo** (cada uno puede limitarse a un coche):

| Activador                                          | Se dispara cuando…                                                                                                | Filtro                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Volvo: cerrado o abierto**                       | el coche se bloquea o se desbloquea                                                                               | nuevo estado             |
| **Volvo: cerrado pero abierto**                    | el coche se bloquea mientras una puerta, una ventanilla, el techo solar, el portón trasero o el capó está abierto | —                        |
| **Volvo: motor arrancado o parado**                | el motor arranca o se para                                                                                        | arrancado / parado       |
| **Volvo: estado de carga modificado**              | la carga empieza, termina, se detiene, se programa o falla                                                        | nuevo estado             |
| **Volvo: cable de carga conectado o desconectado** | el cable se conecta o se desconecta                                                                               | conectado / desconectado |
| **Volvo: llegada a casa o salida**                 | el coche entra en el radio de la vivienda o sale de él                                                            | llegada / salida         |
| **Volvo: nueva alerta**                            | aparece una nueva alerta (neumático, líquido, bombilla, mantenimiento)                                            | —                        |
| **Volvo: nuevo inicio de sesión necesario**        | Volvo ha puesto fin a la autorización de Gladys                                                                   | —                        |

Cada activador proporciona un **resumen** listo para enviar («Volvo XC40 (2024) está bloqueado pero abierto: ventanilla delantera izquierda.») y sus propios datos: lo que está abierto, nivel de batería, distancia desde casa, nombre de la alerta…

Ejemplos:

- **Cerrado pero abierto** → enviarme una notificación con el resumen;
- **Llegada a casa** → abrir el portón y encender las luces exteriores;
- **Carga completa** → avisarme;
- **Nuevo inicio de sesión necesario** → enviarme un mensaje como recordatorio para hacer clic en Conectar.

Conviene saber: Volvo no envía nada por sí mismo, la integración lee el coche en el intervalo elegido. Por eso una escena reacciona con unos minutos de retraso. Al iniciarse la integración, la primera lectura sirve de referencia: un coche ya desbloqueado no dispara nada.

## Escenas: acciones

| Acción                       | Resultado                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Volvo: enviar un comando** | bloquear, desbloquear (vigilancia reducida posible), climatizar, hacer parpadear las luces, tocar el claxon, arrancar o parar el motor; espera al coche e indica si el comando se ha ejecutado |
| **Volvo: estado del coche**  | cerrado, todo cerrado, lo que está abierto, batería, combustible, autonomías, carga, motor, kilometraje, en casa, distancia, latitud, longitud, enlace al mapa, alertas, resumen               |

Un comando que el coche no ofrece (por ejemplo, el arranque remoto del motor en un coche eléctrico) se rechaza. El estado usa la última lectura; marque **Leer el coche ahora** para obtener un valor actualizado (consume cuota).

Cuidado con **Tocar el claxon** y **Hacer parpadear las luces**: estos comandos han descargado la batería de 12 V de algunos coches. La integración nunca los envía por sí misma.

## Widget del panel

El widget **Coche Volvo** muestra la foto de su coche (modelo y color exactos), la batería o el combustible y la autonomía, y después el estado: cierre, aperturas, carga, motor, posición, mantenimiento, alertas y la antigüedad de los datos. Sus botones: **Bloquear** / **Desbloquear** (con confirmación), **Climatizar** / **Parar clima**, **Ráfaga de luces** (para encontrar el coche en un aparcamiento, con confirmación) y **Ver en el mapa**. Los botones se pueden ocultar en los ajustes del widget.

![Dos widgets «Coche Volvo»: un XC40 eléctrico cargando en casa (batería al 53 %, 250 km de autonomía, todo cerrado) y un XC90 de gasolina aparcado a 12 km, con la ventanilla trasera izquierda abierta y la climatización en marcha — ilustración generada, no una captura de pantalla](https://raw.githubusercontent.com/William-De71/gladys-volvo/main/docs/assets/widgets.es.png)

## Solución de problemas

| Síntoma                                                | Causa probable                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| La página de Volvo ID muestra un error de Redirect URI | la Redirect URI declarada al publicar no coincide exactamente con la que muestra Gladys                                        |
| La página de Volvo ID rechaza los scopes               | no se marcaron todos los scopes al publicar                                                                                    |
| «Volvo rechaza la clave de API o un scope»             | VCC API key mal copiada, o aplicación sin los scopes necesarios                                                                |
| «Cuota diaria de la API de Volvo alcanzada»            | demasiadas solicitudes para una sola aplicación: aumente el intervalo de lectura o cree una aplicación por coche               |
| «Volvo ha revocado la autorización»                    | fin del periodo de autorización de la aplicación: haga clic en Conectar                                                        |
| Sin posición ni distancia desde casa                   | la posición no está disponible en su país, o su vivienda no está localizada en Gladys                                          |
| Un comando no tiene efecto                             | coche en reposo profundo o sin red: el comando falla al cabo de un rato; los registros de la integración indican el estado     |
| Punto naranja en la insignia Nube                      | según Volvo, el coche no puede ejecutar órdenes remotas en este momento: el motivo aparece al pasar el ratón sobre la insignia |
| Textos en el idioma equivocado                         | ajuste **Idioma de los textos** en la configuración; en Automático, prevalece el idioma del último panel abierto               |
