import pool from '../config/database.js';

export class Property {
  static formatProperty(row) {
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      price: row.price,
      currency: row.currency,
      location: {
        city: row.city,
        municipality: row.municipality,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude
      },
      specifications: {
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        area: row.area ?? 0,
        floor: row.floor,
        totalFloors: row.total_floors,
        yearBuilt: row.year_built
      },
      features: row.features || [],
      images: row.images || [],
      status: row.status,
      agentId: row.agent_id,
      agentName: row.agent_name,
      agentAvatar: row.agent_avatar,
      agentAgency: row.agent_agency,
      agentRating: row.agent_rating,
      agentPhone: row.agent_phone,
      agentReviewCount: row.agent_review_count,
      isVerified: Boolean(row.is_verified),
      views: row.views ?? 0,
      featured: row.featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static formatProperties(rows) {
    return rows.map((row) => this.formatProperty(row)).filter(Boolean);
  }

  static async create(propertyData) {
    const {
      title,
      description,
      type,
      category,
      price,
      currency = 'ALL',
      city,
      municipality,
      address,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      area,
      floor,
      totalFloors,
      yearBuilt,
      features = [],
      images = [],
      agentId
    } = propertyData;

    const query = `
      INSERT INTO properties (
        title, description, type, category, price, currency, city, municipality,
        address, latitude, longitude, bedrooms, bathrooms, area, floor,
        total_floors, year_built, features, images, agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      description,
      type,
      category,
      price,
      currency,
      city,
      municipality,
      address,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      area,
      floor,
      totalFloors,
      yearBuilt,
      features,
      images,
      agentId
    ]);

    return this.formatProperty(result.rows[0]);
  }

  static async findById(id) {
    const query = `
      SELECT p.*,
             u.name as agent_name,
             u.phone as agent_phone,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return this.formatProperty(result.rows[0]);
  }

  static async search(filters = {}, page = 1, limit = 12) {
    const {
      type,
      category,
      city,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minArea,
      maxArea,
      features,
      search
    } = filters;

    let whereConditions = ['p.status = $1'];
    const queryParams = ['active'];
    let paramCount = 1;

    if (type) {
      paramCount++;
      whereConditions.push(`p.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`p.category = $${paramCount}`);
      queryParams.push(category);
    }

    if (city) {
      paramCount++;
      whereConditions.push(`p.city ILIKE $${paramCount}`);
      queryParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (minPrice !== undefined) {
      paramCount++;
      whereConditions.push(`p.price >= $${paramCount}`);
      queryParams.push(minPrice);
    }

    if (maxPrice !== undefined) {
      paramCount++;
      whereConditions.push(`p.price <= $${paramCount}`);
      queryParams.push(maxPrice);
    }

    if (minBedrooms !== undefined) {
      paramCount++;
      whereConditions.push(`p.bedrooms >= $${paramCount}`);
      queryParams.push(minBedrooms);
    }

    if (maxBedrooms !== undefined) {
      paramCount++;
      whereConditions.push(`p.bedrooms <= $${paramCount}`);
      queryParams.push(maxBedrooms);
    }

    if (minArea !== undefined) {
      paramCount++;
      whereConditions.push(`p.area >= $${paramCount}`);
      queryParams.push(minArea);
    }

    if (maxArea !== undefined) {
      paramCount++;
      whereConditions.push(`p.area <= $${paramCount}`);
      queryParams.push(maxArea);
    }

    if (features && features.length > 0) {
      const featureConditions = features.map(() => {
        paramCount++;
        return `$${paramCount} = ANY(p.features)`;
      });
      whereConditions.push(`(${featureConditions.join(' OR ')})`);
      queryParams.push(...features);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)
      FROM properties p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const dataQuery = `
      SELECT p.*,
             u.name as agent_name,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      data: this.formatProperties(dataResult.rows),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async incrementViews(propertyId) {
    const query = 'UPDATE properties SET views = views + 1 WHERE id = $1';
    await pool.query(query, [propertyId]);
  }

  static async update(propertyId, updateData) {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    if (setClauses.length === 0) {
      return this.findById(propertyId);
    }

    values.push(propertyId);
    const query = `UPDATE properties SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return this.formatProperty(result.rows[0]);
  }

  static async delete(propertyId) {
    const query = 'DELETE FROM properties WHERE id = $1';
    await pool.query(query, [propertyId]);
  }

  static async getFeatured() {
    const query = `
      SELECT p.*,
             u.name as agent_name,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE p.featured = TRUE
        AND p.status = 'active'
        AND (p.featured_until IS NULL OR p.featured_until > CURRENT_TIMESTAMP)
      ORDER BY p.created_at DESC
      LIMIT 6
    `;

    const result = await pool.query(query);
    return this.formatProperties(result.rows);
  }

  static async getByAgent(agentId, page = 1, limit = 12) {
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)
      FROM properties
      WHERE agent_id = $1 AND status = 'active'
    `;
    const countResult = await pool.query(countQuery, [agentId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT p.*,
             u.name as agent_name,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE p.agent_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const dataResult = await pool.query(dataQuery, [agentId, limit, offset]);

    return {
      properties: this.formatProperties(dataResult.rows),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async toggleFavorite(userId, propertyId) {
    const checkQuery = 'SELECT 1 FROM favorites WHERE user_id = $1 AND property_id = $2';
    const checkResult = await pool.query(checkQuery, [userId, propertyId]);

    if (checkResult.rows.length > 0) {
      const deleteQuery = 'DELETE FROM favorites WHERE user_id = $1 AND property_id = $2';
      await pool.query(deleteQuery, [userId, propertyId]);
      return false;
    }

    const insertQuery = 'INSERT INTO favorites (user_id, property_id) VALUES ($1, $2)';
    await pool.query(insertQuery, [userId, propertyId]);
    return true;
  }

  static async getFavorites(userId, page = 1, limit = 12) {
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)
      FROM favorites f
      JOIN properties p ON f.property_id = p.id
      WHERE f.user_id = $1 AND p.status = 'active'
    `;
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT p.*,
             u.name as agent_name,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM favorites f
      JOIN properties p ON f.property_id = p.id
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE f.user_id = $1 AND p.status = 'active'
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const dataResult = await pool.query(dataQuery, [userId, limit, offset]);

    return {
      properties: this.formatProperties(dataResult.rows),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getSimilarProperties(propertyId, limit = 4) {
    const property = await this.findById(propertyId);
    if (!property) return [];

    const query = `
      SELECT p.*,
             u.name as agent_name,
             u.avatar as agent_avatar,
             a.agency as agent_agency,
             a.rating as agent_rating,
             a.review_count as agent_review_count
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE p.id != $1
        AND p.city = $2
        AND p.type = $3
        AND p.category = $4
        AND p.status = 'active'
      ORDER BY
        ABS(p.price - $5) / COALESCE(NULLIF($5, 0), 1) ASC,
        p.created_at DESC
      LIMIT $6
    `;

    const result = await pool.query(query, [
      propertyId,
      property.location.city,
      property.type,
      property.category,
      property.price,
      limit
    ]);

    return this.formatProperties(result.rows);
  }
}
