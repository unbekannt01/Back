import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../entities/user.entity";  // Import the correct UserRole

export class UpdateUserDto {

    @ApiProperty()
    userName?: string;

    @ApiProperty()
    first_name : string;

    @ApiProperty()
    last_name : string;

    @ApiProperty()
    mobile_no : string;

    @ApiProperty({ required: false, enum: UserRole })  // Ensure this matches the entity
    role?: UserRole;
}
