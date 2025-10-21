import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/security/cors';

/**
 * Generic CRUD route configuration
 */
export interface CrudRouteConfig<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  entityName: string;
  getById: (id: string) => Promise<T | null>;
  create?: (data: CreateData) => Promise<T>;
  updateById: (id: string, data: UpdateData) => Promise<T | null>;
  deleteById: (id: string) => Promise<void>;
  updateSchema: ZodSchema<UpdateData>;
  createSchema?: ZodSchema<CreateData>;
}

/**
 * Route parameters interface
 */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Create standardized CRUD route handlers
 */
export function createCrudRoutes<T, CreateData = Partial<T>, UpdateData = Partial<T>>(
  config: CrudRouteConfig<T, CreateData, UpdateData>
) {
  const { 
    entityName, 
    getById, 
    updateById, 
    deleteById, 
    updateSchema,
    createSchema,
    create 
  } = config;

  // GET /api/entity/[id] - Get entity by ID
  const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
    const { id } = await params;
    
    // Validate UUID format
    const validationResult = uuidSchema.safeParse(id);
    if (!validationResult.success) {
      return createErrorResponse(`Invalid ${entityName} ID format`, HTTP_STATUS.BAD_REQUEST);
    }
    
    const entity = await getById(id);
    
    if (!entity) {
      return createErrorResponse(`${entityName} not found`, HTTP_STATUS.NOT_FOUND);
    }
    
    return createSuccessResponse(entity);
  });

  // PUT /api/entity/[id] - Update entity
  const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
    const { id } = await params;
    
    // Validate UUID format
    const validationResult = uuidSchema.safeParse(id);
    if (!validationResult.success) {
      return createErrorResponse(`Invalid ${entityName} ID format`, HTTP_STATUS.BAD_REQUEST);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(updateSchema, body);
    
    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    
    // Check if entity exists
    const existingEntity = await getById(id);
    if (!existingEntity) {
      return createErrorResponse(`${entityName} not found`, HTTP_STATUS.NOT_FOUND);
    }
    
    // Update entity
    const updatedEntity = await updateById(id, validation.data);
    
    if (!updatedEntity) {
      return createErrorResponse(`Failed to update ${entityName}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    
    return createSuccessResponse(updatedEntity, `${entityName} updated successfully`);
  });

  // DELETE /api/entity/[id] - Delete entity
  const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
    const { id } = await params;
    
    // Validate UUID format
    const validationResult = uuidSchema.safeParse(id);
    if (!validationResult.success) {
      return createErrorResponse(`Invalid ${entityName} ID format`, HTTP_STATUS.BAD_REQUEST);
    }
    
    // Check if entity exists
    const existingEntity = await getById(id);
    if (!existingEntity) {
      return createErrorResponse(`${entityName} not found`, HTTP_STATUS.NOT_FOUND);
    }
    
    // Delete entity
    await deleteById(id);
    
    return createSuccessResponse(null, `${entityName} deleted successfully`, HTTP_STATUS.NO_CONTENT);
  });

  // POST /api/entity - Create entity (optional)
  const POST = create && createSchema ? withErrorHandling(async (request: NextRequest) => {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(createSchema, body);
    
    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    
    // Create entity
    const newEntity = await create(validation.data);
    
    return createSuccessResponse(newEntity, `${entityName} created successfully`, HTTP_STATUS.CREATED);
  }) : undefined;

  // OPTIONS - Handle CORS preflight
  const OPTIONS = async (request: NextRequest) => {
    const methods = ['GET', 'PUT', 'DELETE'];
    if (POST) methods.push('POST');
    methods.push('OPTIONS');

    const corsHeaders = getCorsHeaders(request);
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': methods.join(', '),
      },
    });
  };

  return {
    GET,
    PUT,
    DELETE,
    ...(POST && { POST }),
    OPTIONS
  };
}

/**
 * Create paginated list route handler
 */
export interface PaginatedRouteConfig<T, FilterParams = object> {
  entityName: string;
  getList: (options: {
    limit: number;
    offset: number;
    filters?: FilterParams;
  }) => Promise<{ items: T[]; total: number }>;
  filterSchema?: ZodSchema<FilterParams>;
}

export function createPaginatedRoute<T, FilterParams = object>(
  config: PaginatedRouteConfig<T, FilterParams>
) {
  const { entityName, getList, filterSchema } = config;

  return withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Extract pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Extract and validate filters if schema provided
    let filters: FilterParams | undefined;
    if (filterSchema) {
      const filterParams = Object.fromEntries(searchParams.entries());
      const validation = filterSchema.safeParse(filterParams);
      
      if (!validation.success) {
        return createErrorResponse('Invalid filter parameters', HTTP_STATUS.BAD_REQUEST);
      }
      
      filters = validation.data;
    }

    try {
      const { items, total } = await getList({ limit, offset, filters });
      
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return createSuccessResponse({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      });
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      return createErrorResponse(
        `Failed to fetch ${entityName}`, 
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  });
}