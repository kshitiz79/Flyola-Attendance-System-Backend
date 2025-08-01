import { Document, User, sequelize } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common document types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and text files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private (Admin/Government)
export const getDocuments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      fileName,
      fileType,
      uploadedBy,
      startDate,
      endDate,
      sortBy = 'uploadDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isActive: true };

    // Apply filters
    if (fileName) {
      where[Op.or] = [
        { fileName: { [Op.like]: `%${fileName}%` } },
        { originalName: { [Op.like]: `%${fileName}%` } }
      ];
    }

    if (fileType) {
      where.fileType = { [Op.like]: `%${fileType}%` };
    }

    if (uploadedBy) {
      where.uploadedBy = uploadedBy;
    }

    if (startDate && endDate) {
      where.uploadDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.uploadDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.uploadDate = {
        [Op.lte]: endDate
      };
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows, // Frontend expects data directly
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private (Admin/Government)
export const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    if (!document || !document.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private (Admin only)
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { description } = req.body;
    const file = req.file;

    const document = await Document.create({
      fileName: file.filename,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: req.user.id,
      description: description || null,
      isActive: true
    });

    // Log audit
    await logAudit(
      'CREATE',
      'documents',
      document.id,
      null,
      document.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch the created record with associations
    const createdDocument = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdDocument
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    next(error);
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private (Admin only)
export const updateDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document || !document.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = document.toJSON();
    const { description } = req.body;
    let updateData = {};

    // If new file is uploaded, handle file replacement
    if (req.file) {
      // Delete old file
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        console.error('Error deleting old file:', error);
      }

      updateData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    await document.update(updateData);

    // Log audit
    await logAudit(
      'UPDATE',
      'documents',
      document.id,
      oldValues,
      document.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch updated record with associations
    const updatedDocument = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedDocument
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (Admin only)
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document || !document.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = document.toJSON();

    // Soft delete - mark as inactive
    await document.update({ isActive: false });

    // Log audit
    await logAudit(
      'DELETE',
      'documents',
      document.id,
      oldValues,
      { isActive: false },
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private (Admin/Government)
export const downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document || !document.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found on server',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.fileType);

    // Send file
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    next(error);
  }
};

// @desc    Get document statistics
// @route   GET /api/documents/stats
// @access  Private (Admin/Government)
export const getDocumentStats = async (req, res, next) => {
  try {
    // Get counts by file type
    const typeCounts = await Document.findAll({
      where: { isActive: true },
      attributes: [
        'fileType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize']
      ],
      group: ['fileType'],
      raw: true
    });

    // Get total count and size
    const totals = await Document.findAll({
      where: { isActive: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalDocuments'],
        [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize']
      ],
      raw: true
    });

    // Get recent uploads
    const recentUploads = await Document.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        total: totals[0] || { totalDocuments: 0, totalSize: 0 },
        typeBreakdown: typeCounts,
        recentUploads
      }
    });
  } catch (error) {
    next(error);
  }
};