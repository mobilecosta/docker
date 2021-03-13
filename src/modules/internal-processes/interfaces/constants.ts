export const ERROR_CODE_IT_INVOLVED = [
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  406, // Not Acceptable
  407, // Proxy Authentication Required
  411, // Length Required
  413, // Payload Too large
  414, // URI Too Long
  415, // Unsupported Media Type
  416, // Requested Range Not Satisfiable
  422, // Unprocessable Entity
  451, // Unavailable For Legal Reasons
];

export const ERROR_CODE_INTERNAL_RETRY = [
  408, // Request Timeout
  409, // Conflict
  410, // Gone
  412, // Precondition Failed
  417, // Expectation Failed
  421, // Misdirected Request
  423, // Locked
  424, // Failed Dependency
  425, // Too Early
  426, // Upgrade Required
  428, // Precondition Required
  429, // Too Many Requests
  431, // Request Header Fields Too Large
  500, // Internal Server Error
  501, // Not Implemented
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
  505, // HTTP Version Not Supported
  506, // Variant Also Negotiates
  507, // Insufficient Storage
  508, // Loop Detected (WebDAV)
  510, // Not Extended
  511, // Network Authentication Required
];
