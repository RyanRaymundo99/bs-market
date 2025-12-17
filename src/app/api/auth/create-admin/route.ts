import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Allow on localhost or if ALLOW_ADMIN_CREATION env var is set
    const host = request.headers.get("host") || "";
    const allowCreation = process.env.ALLOW_ADMIN_CREATION === "true";
    const isLocalhost =
      host.includes("localhost") || host.includes("127.0.0.1");

    if (!isLocalhost && !allowCreation) {
      return NextResponse.json(
        {
          error: "This endpoint is only available on localhost",
          hint: "Set ALLOW_ADMIN_CREATION=true in environment variables to enable on production (use with caution!)",
        },
        { status: 403 }
      );
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { id: "admin_001" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin user already exists",
          admin: {
            id: existingAdmin.id,
            email: existingAdmin.email,
            name: existingAdmin.name,
          },
        },
        { status: 200 }
      );
    }

    // Generate secure admin credentials
    const adminEmail = "admin@bsmarket.com.br";
    // Generate a secure random password: 16 characters with uppercase, lowercase, numbers, and special chars
    const generateSecurePassword = () => {
      const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const lowercase = "abcdefghijkmnopqrstuvwxyz";
      const numbers = "23456789";
      const special = "!@#$%&*";
      const allChars = uppercase + lowercase + numbers + special;

      let password = "";
      // Ensure at least one of each type
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];

      // Fill the rest randomly
      for (let i = password.length; i < 16; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }

      // Shuffle the password
      return password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");
    };

    const adminPassword = generateSecurePassword();
    const hashedPassword = await hash(adminPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        id: "admin_001",
        name: "System Administrator",
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        emailVerified: true,
        phoneVerified: true,
        approvalStatus: "APPROVED",
        kycStatus: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create initial balance for admin
    await prisma.balance.create({
      data: {
        userId: adminUser.id,
        currency: "BRL",
        amount: 0,
        locked: 0,
      },
    });

    console.log("Admin user created successfully:", {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
      credentials: {
        email: adminUser.email,
        password: adminPassword, // ⚠️ SECURE: Only shown once on creation - SAVE THIS!
      },
      security: {
        warning:
          "⚠️ IMPORTANT: Save these credentials immediately. They will not be shown again.",
        instructions: [
          "1. Copy and save the password in a secure password manager",
          "2. Login at /admin/login with these credentials",
          "3. Change the password immediately after first login",
          "4. Remove ALLOW_ADMIN_CREATION from environment variables",
        ],
      },
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create admin user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
