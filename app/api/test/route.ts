import { NextResponse } from "next/server";

export async function POST() {

    console.log("ESP TEST RECEIVED");

    return NextResponse.json({
        success: true,
        message: "ESP Connected"
    });

}