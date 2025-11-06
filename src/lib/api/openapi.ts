import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

// OpenAPI 3.0 specification for the Loom Coaching Platform API
// Dynamically loads from the comprehensive openapi.yaml file
function loadOpenApiSpec() {
  try {
    // Try to load the comprehensive openapi.yaml file
    const yamlPath = join(process.cwd(), 'openapi.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const spec = yaml.load(yamlContent) as any;
    
    // Update server URLs based on environment
    if (spec && spec.servers) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseUrl = isDevelopment ? 'http://localhost:3000/api' : 'https://loom-app.vercel.app/api';
      
      spec.servers = [
        {
          url: baseUrl,
          description: `${isDevelopment ? 'Development' : 'Production'} server`
        },
        ...(isDevelopment ? [{
          url: 'http://localhost:3000/api',
          description: 'Local development server'
        }] : [])
      ];
    }
    
    return spec;
  } catch (error) {
    logger.warn('Could not load openapi.yaml, using embedded spec:', error);
    return embeddedOpenApiSpec;
  }
}

const embeddedOpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Loom Coaching Platform API',
    description: 'RESTful API for the Phoenix architecture coaching platform with comprehensive session management, user administration, and notification systems.',
    version: '1.0.0',
    contact: {
      name: 'Loom Support',
      email: 'support@loom.dev',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.loom.dev',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.loom.dev',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Common schemas
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            description: 'The response data',
          },
          message: {
            type: 'string',
            description: 'Optional message describing the result',
          },
        },
        required: ['success'],
      },
      ApiError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
        required: ['success', 'error'],
      },
      PaginatedResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiResponse' },
          {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Current page number',
                  },
                  limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100,
                    description: 'Number of items per page',
                  },
                  total: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Total number of items',
                  },
                  totalPages: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Total number of pages',
                  },
                  hasNext: {
                    type: 'boolean',
                    description: 'Whether there is a next page',
                  },
                  hasPrev: {
                    type: 'boolean',
                    description: 'Whether there is a previous page',
                  },
                },
                required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
              },
            },
            required: ['pagination'],
          },
        ],
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          firstName: {
            type: 'string',
            maxLength: 50,
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            maxLength: 50,
            description: 'User last name',
          },
          role: {
            type: 'string',
            enum: ['client', 'coach', 'admin'],
            description: 'User role in the platform',
          },
          phone: {
            type: 'string',
            nullable: true,
            description: 'User phone number',
          },
          timezone: {
            type: 'string',
            nullable: true,
            description: 'User timezone',
          },
          language: {
            type: 'string',
            enum: ['en', 'he'],
            default: 'en',
            description: 'User preferred language',
          },
          avatar: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'User avatar URL',
          },
          bio: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'User biography',
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            default: 'active',
            description: 'User account status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt', 'updatedAt'],
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          firstName: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'User last name',
          },
          role: {
            type: 'string',
            enum: ['client', 'coach'],
            description: 'User role (admin can only be created by other admins)',
          },
          phone: {
            type: 'string',
            description: 'User phone number',
          },
          timezone: {
            type: 'string',
            description: 'User timezone',
          },
          language: {
            type: 'string',
            enum: ['en', 'he'],
            default: 'en',
            description: 'User preferred language',
          },
        },
        required: ['email', 'firstName', 'lastName', 'role'],
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
          },
          lastName: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
          },
          phone: {
            type: 'string',
          },
          timezone: {
            type: 'string',
          },
          language: {
            type: 'string',
            enum: ['en', 'he'],
          },
          avatar: {
            type: 'string',
            format: 'uri',
          },
          bio: {
            type: 'string',
            maxLength: 500,
          },
        },
      },
      // Session schemas
      Session: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique session identifier',
          },
          title: {
            type: 'string',
            maxLength: 100,
            description: 'Session title',
          },
          description: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'Session description',
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            description: 'Scheduled session date and time',
          },
          duration: {
            type: 'integer',
            minimum: 15,
            maximum: 480,
            description: 'Session duration in minutes',
          },
          status: {
            type: 'string',
            enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
            description: 'Current session status',
          },
          coachId: {
            type: 'string',
            format: 'uuid',
            description: 'Coach user ID',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
            description: 'Client user ID',
          },
          meetingUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Video meeting URL',
          },
          notes: {
            type: 'string',
            maxLength: 2000,
            nullable: true,
            description: 'Session notes',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'title', 'scheduledAt', 'duration', 'status', 'coachId', 'clientId', 'createdAt', 'updatedAt'],
      },
      CreateSessionRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          description: {
            type: 'string',
            maxLength: 500,
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
          },
          duration: {
            type: 'integer',
            minimum: 15,
            maximum: 480,
          },
          coachId: {
            type: 'string',
            format: 'uuid',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          meetingUrl: {
            type: 'string',
            format: 'uri',
          },
        },
        required: ['title', 'scheduledAt', 'duration', 'coachId', 'clientId'],
      },
      UpdateSessionRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          description: {
            type: 'string',
            maxLength: 500,
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
          },
          duration: {
            type: 'integer',
            minimum: 15,
            maximum: 480,
          },
          status: {
            type: 'string',
            enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
          },
          meetingUrl: {
            type: 'string',
            format: 'uri',
          },
          notes: {
            type: 'string',
            maxLength: 2000,
          },
        },
      },
      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          userId: {
            type: 'string',
            format: 'uuid',
          },
          type: {
            type: 'string',
            enum: ['session_reminder', 'new_message', 'session_confirmation', 'system_update'],
          },
          title: {
            type: 'string',
            maxLength: 100,
          },
          content: {
            type: 'string',
            maxLength: 500,
          },
          isRead: {
            type: 'boolean',
            default: false,
          },
          isArchived: {
            type: 'boolean',
            default: false,
          },
          scheduledFor: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          metadata: {
            type: 'object',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'userId', 'type', 'title', 'content', 'isRead', 'isArchived', 'createdAt', 'updatedAt'],
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
        },
      },
      SortByParam: {
        name: 'sortBy',
        in: 'query',
        description: 'Field to sort by',
        schema: {
          type: 'string',
        },
      },
      SortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort order',
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'asc',
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      UnprocessableEntity: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiError',
            },
          },
        },
      },
    },
  },
  paths: {
    '/users': {
      get: {
        summary: 'List users',
        description: 'Retrieve a paginated list of users with optional filtering',
        tags: ['Users'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by user role',
            schema: {
              type: 'string',
              enum: ['client', 'coach', 'admin'],
            },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search users by name or email',
            schema: {
              type: 'string',
            },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by user status',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedResponse' },
                    {
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by their ID',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      properties: {
                        data: { $ref: '#/components/schemas/User' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      put: {
        summary: 'Update user',
        description: 'Update a specific user',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      properties: {
                        data: { $ref: '#/components/schemas/User' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { $ref: '#/components/responses/UnprocessableEntity' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      delete: {
        summary: 'Delete user',
        description: 'Delete a specific user',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '204': {
            description: 'User deleted successfully',
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/sessions': {
      get: {
        summary: 'List sessions',
        description: 'Retrieve a paginated list of sessions with optional filtering',
        tags: ['Sessions'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by session status',
            schema: {
              type: 'string',
              enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
            },
          },
          {
            name: 'coachId',
            in: 'query',
            description: 'Filter by coach ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
          {
            name: 'clientId',
            in: 'query',
            description: 'Filter by client ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
          {
            name: 'from',
            in: 'query',
            description: 'Filter sessions from this date',
            schema: {
              type: 'string',
              format: 'date-time',
            },
          },
          {
            name: 'to',
            in: 'query',
            description: 'Filter sessions to this date',
            schema: {
              type: 'string',
              format: 'date-time',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Sessions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedResponse' },
                    {
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Session' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      post: {
        summary: 'Create session',
        description: 'Create a new coaching session',
        tags: ['Sessions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSessionRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Session created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      properties: {
                        data: { $ref: '#/components/schemas/Session' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '422': { $ref: '#/components/responses/UnprocessableEntity' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/sessions/{id}': {
      get: {
        summary: 'Get session by ID',
        description: 'Retrieve a specific session by its ID',
        tags: ['Sessions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Session ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Session retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      properties: {
                        data: { $ref: '#/components/schemas/Session' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      put: {
        summary: 'Update session',
        description: 'Update a specific session',
        tags: ['Sessions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Session ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSessionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      properties: {
                        data: { $ref: '#/components/schemas/Session' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { $ref: '#/components/responses/UnprocessableEntity' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      delete: {
        summary: 'Delete session',
        description: 'Delete a specific session',
        tags: ['Sessions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Session ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '204': {
            description: 'Session deleted successfully',
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/notifications': {
      get: {
        summary: 'List notifications',
        description: 'Retrieve a paginated list of notifications for the authenticated user',
        tags: ['Notifications'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
          {
            name: 'isRead',
            in: 'query',
            description: 'Filter by read status',
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'isArchived',
            in: 'query',
            description: 'Filter by archived status',
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by notification type',
            schema: {
              type: 'string',
              enum: ['session_reminder', 'new_message', 'session_confirmation', 'system_update'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Notifications retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedResponse' },
                    {
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Notification' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
  tags: [
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Sessions',
      description: 'Coaching session management',
    },
    {
      name: 'Notifications',
      description: 'Notification system operations',
    },
  ],
};

// Export the OpenAPI specification
export const openApiSpec = loadOpenApiSpec();