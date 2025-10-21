import pool from '../config/database.js';

export class Property {
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

    return result.rows[0];
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
    return result.rows[0];
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
      features
    } = filters;

    let whereConditions = ['p.status = $1'];
    let queryParams = ['active'];
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

    if (minPrice) {
      paramCount++;
      whereConditions.push(`p.price >= $${paramCount}`);
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      whereConditions.push(`p.price <= $${paramCount}`);
      queryParams.push(maxPrice);
    }

    if (minBedrooms) {
      paramCount++;
      whereConditions.push(`p.bedrooms >= $${paramCount}`);
      queryParams.push(minBedrooms);
    }

    if (maxBedrooms) {
      paramCount++;
      whereConditions.push(`p.bedrooms <= $${paramCount}`);
      queryParams.push(maxBedrooms);
    }

    if (minArea) {
      paramCount++;
      whereConditions.push(`p.area >= $${paramCount}`);
      queryParams.push(minArea);
    }

    if (maxArea) {
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

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM properties p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Data query
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
             a.rating as agent_rating
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      properties: dataResult.rows,
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

    Object.keys(updateData).forEach(key => {
      setClauses.push(`${key} = $${paramCount}`);
      values.push(updateData[key]);
      paramCount++;
    });

    values.push(propertyId);
    const query = `UPDATE properties SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(propertyId) {
    const query = 'DELETE FROM properties WHERE id = $1';
    await pool.query(query, [propertyId]);
  }
}
