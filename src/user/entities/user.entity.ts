import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
    USER = 'User',
    ADMIN = 'Admin',
    SUPER_ADMIN = 'Super_Admin'
}

export enum otp_type{
    EMAIL_VERIFICATION = 'email_verification',
    FORGOT_PASSWORD = 'forgot_password'
}

@Entity({ name: 'user_1' })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    userName: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column()
    mobile_no: string;

    @Column({ default: 'INACTIVE' })
    status: string;

    @Column({ type: 'varchar', nullable: true })
    otp: string | null;

    @Column({ type: 'timestamp', nullable: true })
    otpExpiration: Date | null;

    @Column({ nullable: true, default: false })
    is_logged_in: boolean;

    @Column({ nullable: true, default: true })
    is_logged_out: boolean;

    @Column({ type: 'enum', enum: otp_type , nullable: true })
    otp_type: otp_type | null;

    @Column({ default: UserRole.ADMIN})
    role: UserRole;
}